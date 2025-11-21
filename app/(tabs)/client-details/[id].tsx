import React, { useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Modal, ActivityIndicator, TextInput } from 'react-native';
import Toast, { ToastHandles } from '@/components/Toast';
import { Image } from 'expo-image';
import { useTheme } from '@/context/ThemeContext';
import { useLocalSearchParams, router } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { Platform } from 'react-native';
import { ChevronLeft, Phone, Mail, Calendar, CreditCard, CreditCard as Edit, Instagram, Dumbbell, Clock, ChevronRight, Plus, X, Search, Trash2, FileText } from 'lucide-react-native';
import ClientCycleProgress from '@/components/ClientCycleProgress';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Client {
  user_id: string;
  nome: string;
  email: string;
  telefone: string;
  instagram: string;
  foto: string;
  dataNasc: string;
  ativo: boolean;
  created_at: string;
}

interface ClientWorkout {
  id: string;
  id_aluna: string;
  id_fichas: number;
  data_inicio: string;
  data_fim: string | null;
  fichas: {
    id: number;
    nome_ficha: string;
    descricao: string | null;
  };
}

interface WorkoutPlan {
  id: number;
  nome_ficha: string;
  descricao: string | null;
  nivel: 'iniciante' | 'intermediário' | 'avançado' | null;
  objetivo: string | null;
  duracao_treino: string | null;
  modalidade: string | null;
  status: boolean | null;
}

export default function ClientDetailsScreen() {
  const toastRef = useRef<ToastHandles>(null);
  const { colors } = useTheme();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<Client | null>(null);
  const [workouts, setWorkouts] = useState<ClientWorkout[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddWorkoutModal, setShowAddWorkoutModal] = useState(false);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [availableWorkouts, setAvailableWorkouts] = useState<WorkoutPlan[]>([]);
  const [addingWorkout, setAddingWorkout] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchWorkout, setSearchWorkout] = useState('');
  const [filteredWorkouts, setFilteredWorkouts] = useState<WorkoutPlan[]>([]);

  useEffect(() => {
    async function fetchClient() {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('user_id', id)
          .single();

        if (error) throw error;
        setClient(data);
      } catch (error) {
        console.error('Error fetching client:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchClient();
    fetchClientWorkouts();
  }, [id]);

  const fetchClientWorkouts = async () => {
    setLoading(true);
    try {
      // Consulta para obter as fichas das alunas com join na tabela fichas
      const { data, error } = await supabase
        .from('fichas_das_alunas')
        .select(`
          id,
          id_aluna,
          id_fichas,
          data_inicio,
          data_fim,
          fichas (
            id, 
            nome_ficha, 
            descricao
          )
        `)
        .eq('id_aluna', id)
        .order('fichas(nome_ficha)', { ascending: true });

      if (error) throw error;
      
      console.log('Dados brutos das fichas:', data);
      
      // Garantir que os dados correspondam à interface ClientWorkout
      const formattedData: ClientWorkout[] = data?.map(item => {
        // Verificar se fichas existe e tem as propriedades esperadas
        if (!item.fichas) {
          console.warn('Ficha não encontrada para o registro:', item);
        }
        
        // Assegurar que fichas é tratado como um objeto e não um array
        // Usando any para evitar erros de tipagem
        const fichasObj: any = item.fichas || {};
        
        return {
          id: item.id,
          id_aluna: item.id_aluna,
          id_fichas: item.id_fichas,
          data_inicio: item.data_inicio,
          data_fim: item.data_fim,
          fichas: {
            id: fichasObj.id || 0,
            nome_ficha: fichasObj.nome_ficha || 'Ficha não encontrada',
            descricao: fichasObj.descricao || null
          }
        };
      }) || [];
      
      console.log('Dados formatados das fichas:', formattedData);
      setWorkouts(formattedData);
    } catch (error) {
      console.error('Erro ao buscar fichas da aluna:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchAvailableWorkouts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fichas')
        .select('*')
        .order('nome_ficha', { ascending: true });

      if (error) throw error;
      
      // Mapeamos os dados para o formato correto
      const formattedData: WorkoutPlan[] = data?.map((ficha) => ({
        id: ficha.id,
        nome_ficha: ficha.nome_ficha,
        descricao: ficha.descricao,
        nivel: ficha.nivel,
        objetivo: ficha.objetivo,
        duracao_treino: ficha.duracao_treino,
        modalidade: ficha.modalidade,
        status: ficha.status
      })) || [];
      
      setAvailableWorkouts(formattedData);
      setFilteredWorkouts(formattedData);
    } catch (error) {
      console.error('Erro ao buscar fichas disponíveis:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddWorkoutClick = () => {
    fetchAvailableWorkouts();
    setShowAddWorkoutModal(true);
  };
  
  const handleSelectWorkout = async (fichaId: number) => {
    try {
      if (!id || !fichaId) {
        toastRef.current?.show({ message: 'Informações de aluna ou ficha inválidas', type: 'error' });
        return;
      }

      console.log(`Tentando adicionar ficha id=${fichaId} para aluna id=${id}`);

      // Verificar se já existe uma ficha ativa para esta aluna
      const dataAtual = new Date().toISOString();
      const { data: existingFichas, error: checkError } = await supabase
        .from('fichas_das_alunas')
        .select('id, data_fim')
        .eq('id_aluna', id)
        .eq('id_fichas', fichaId)
        .gte('data_fim', dataAtual); // Apenas fichas ativas

      if (checkError) {
        console.error('Erro ao verificar fichas existentes:', checkError);
        toastRef.current?.show({ message: 'Erro ao verificar fichas existentes.', type: 'error' });
        return;
      }

      if (existingFichas && existingFichas.length > 0) {
        const dataFimFormatada = new Date(existingFichas[0].data_fim).toLocaleDateString('pt-BR');
        if (confirm(`Esta aluna já possui esta ficha ativa até ${dataFimFormatada}. Deseja adicionar mesmo assim?`)) {
          await addWorkout(fichaId);
        }
      } else {
        await addWorkout(fichaId);
      }

      setShowAddWorkoutModal(false);
      setSearchWorkout('');
    } catch (error) {
      console.error('Erro ao processar a seleção da ficha:', error);
      toastRef.current?.show({ message: 'Erro ao processar a seleção da ficha.', type: 'error' });
    }
  };
  
  const addWorkout = async (fichaId: number) => {
    try {
      console.log(`Adicionando ficha ${fichaId} para aluna ${id}`);
      
      // Data de início = agora
      const dataInicio = new Date();
      
      // Data de fim = 5 semanas depois
      const dataFim = new Date(dataInicio);
      dataFim.setDate(dataInicio.getDate() + 35);
      
      // Formatação ISO 8601 para o PostgreSQL
      const dataInicioStr = dataInicio.toISOString();
      const dataFimStr = dataFim.toISOString();
      
      console.log(`Data início: ${dataInicioStr}, Data fim: ${dataFimStr}`);
      
      // Gerando um ID numérico baseado no timestamp
      const numericId = parseInt(Date.now().toString().slice(0, 13));
      console.log('ID numérico gerado:', numericId);
      
      // Criando o objeto para inserção
      const newWorkout = {
        id: numericId, // Agora é um número inteiro (bigint)
        id_aluna: id as string,
        id_fichas: fichaId,
        data_inicio: dataInicioStr,
        data_fim: dataFimStr
      };
      
      // Inserindo no Supabase
      const { data, error } = await supabase
        .from('fichas_das_alunas')
        .insert(newWorkout)
        .select('*');
      
      if (error) {
        console.error('Erro ao adicionar treino:', error);
        throw error;
      }
      
      console.log('Treino adicionado com sucesso:', data);
      toastRef.current?.show({ message: 'Treino adicionado com sucesso!', type: 'success' });
      
      // Atualizando a lista de treinos
      fetchClientWorkouts();
    } catch (error: any) {
      console.error('Erro ao criar vínculo:', error);
      if (error?.code === '42501') {
        toastRef.current?.show({ message: 'Você não tem permissão para realizar esta ação.', type: 'error' });
      } else {
        toastRef.current?.show({ message: `Erro ao adicionar o treino: ${error.message || 'Erro desconhecido'}`, type: 'error' });
      }
    }
  };
  
  // Função para abrir o modal de confirmação de exclusão
  const handleDeleteWorkoutClick = (workout: ClientWorkout) => {
    setSelectedWorkoutId(workout.id);
    setShowDeleteModal(true);
  };

  // Função para remover uma ficha da aluna
  const handleDeleteWorkout = async () => {
    if (!selectedWorkoutId) return;
    
    try {
      setAddingWorkout(true);
      
      // Remover a ficha da aluna
      const { error } = await supabase
        .from('fichas_das_alunas')
        .delete()
        .eq('id', selectedWorkoutId);
      
      if (error) throw error;
      
      // Atualizar a lista de treinos
      setWorkouts(workouts.filter(workout => workout.id !== selectedWorkoutId));
      
      toastRef.current?.show({ message: 'Treino removido com sucesso!', type: 'success' });
      
      // Fechar o modal
      setShowDeleteModal(false);
      setSelectedWorkoutId(null);
      
    } catch (error: any) {
      console.error('Erro ao remover treino:', error);
      toastRef.current?.show({ message: `Ocorreu um erro ao remover o treino: ${error.message || error}`, type: 'error' });
    } finally {
      setAddingWorkout(false);
    }
  };
  
  // Efeito para filtrar os treinos disponíveis com base na pesquisa
  useEffect(() => {
    if (searchWorkout.trim() === '') {
      setFilteredWorkouts(availableWorkouts);
    } else {
      const filtered = availableWorkouts.filter(
        workout => 
          workout.nome_ficha.toLowerCase().includes(searchWorkout.toLowerCase()) ||
          (workout.descricao && workout.descricao.toLowerCase().includes(searchWorkout.toLowerCase()))
      );
      setFilteredWorkouts(filtered);
    }
  }, [searchWorkout, availableWorkouts]);
  
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.text }]}>Carregando...</Text>
      </View>
    );
  }

  if (!client) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.text }]}>Cliente não encontrado</Text>
      </View>
    );
  }

// Sample data for the progress charts
const weightData = {
  labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai'],
  datasets: [{
    data: [75, 74, 72.5, 71.8, 70.2],
  }],
};

const measurementsData = {
  labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai'],
  datasets: [{
    data: [95, 93, 91, 89, 88],
  }],
};

  const chartConfig = {
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(236, 72, 153, ${opacity})`,
    labelColor: () => colors.textSecondary,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: Platform.select({ web: '0', default: '6' }), // Disable dots on web
      strokeWidth: '2',
      stroke: '#EC4899',
      fill: 'white',
    },
    useShadowColorFromDataset: false,
    withHorizontalLines: true,
    withVerticalLines: false,
    withDots: Platform.OS !== 'web', // Disable dots on web
    withShadow: false,
    withScrollableDot: false,
    withInnerLines: false,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Image
            source={client.foto || 'https://via.placeholder.com/120'}
            style={styles.profileImage}
          />
          <Text style={[styles.profileName, { color: colors.text }]}>{client.nome}</Text>
          <View style={[
            styles.statusBadge, 
            { backgroundColor: client.ativo ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }
          ]}>
            <Text style={[
              styles.statusText,
              { color: client.ativo ? '#10B981' : '#EF4444' }
            ]}>
              {client.ativo ? 'Ativa' : 'Inativa'}
            </Text>
          </View>
        </View>

        <View style={styles.contactInfo}>
          <View style={[styles.contactItem, { backgroundColor: colors.card }]}>
            <Phone size={20} color={colors.primary} />
            <Text style={[styles.contactText, { color: colors.text }]}>{client.telefone || 'Não informado'}</Text>
          </View>
          <View style={[styles.contactItem, { backgroundColor: colors.card }]}>
            <Mail size={20} color={colors.primary} />
            <Text style={[styles.contactText, { color: colors.text }]}>{client.email || 'Não informado'}</Text>
          </View>
          <View style={[styles.contactItem, { backgroundColor: colors.card }]}>
            <Instagram size={20} color={colors.primary} />
            <Text style={[styles.contactText, { color: colors.text }]}>{client.instagram || 'Não informado'}</Text>
          </View>
        </View>

        {/* Botão Ver Anamnese */}
        <TouchableOpacity 
          style={[styles.anamneseButton, { backgroundColor: colors.primary, marginHorizontal: 20, marginBottom: 20 }]}
          activeOpacity={0.8}
          onPress={() => router.push(`/aluna-anamnese/${id}`)}
        >
          <FileText size={18} color="white" style={{ marginRight: 8 }} />
          <Text style={styles.anamneseButtonText}>Ver anamnese da aluna</Text>
        </TouchableOpacity>

        {/* Progresso do Ciclo */}
        <View style={{ paddingHorizontal: 20 }}>
          <ClientCycleProgress alunaId={id as string} />
        </View>

        <View style={styles.infoCards}>
          <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
            <Calendar size={20} color={colors.primary} />
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Data de Nascimento</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{client.dataNasc || 'Não informado'}</Text>
          </View>
          
          <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
            <Calendar size={20} color={colors.primary} />
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Cliente desde</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {new Date(client.created_at).toLocaleDateString('pt-BR')}
            </Text>
          </View>
        </View>

        {/* Seção de Treinos da Aluna */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Treinos da Aluna</Text>
            <TouchableOpacity 
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={handleAddWorkoutClick}
            >
              <Plus size={20} color="white" />
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando treinos...</Text>
            </View>
          ) : workouts.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: colors.card }]}>
              <Dumbbell size={40} color={colors.textSecondary} style={{ opacity: 0.5 }} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nenhum treino encontrado</Text>
            </View>
          ) : (
            <FlatList
              data={workouts}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => {
                // Calcular a data fim como 5 semanas após a data inicial
                const dataInicio = new Date(item.data_inicio);
                const dataFim = new Date(dataInicio);
                dataFim.setDate(dataInicio.getDate() + 35); // 5 semanas = 35 dias
                
                return (
                  <View style={[styles.workoutCard, { backgroundColor: colors.card }]}>
                    <View style={styles.workoutCardContent}>
                      <View style={styles.workoutCardHeader}>
                        <TouchableOpacity 
                          style={{ flex: 1 }}
                          onPress={() => {
                            console.log('🔍 CLIENT-DETAILS - Navegando para ficha-details');
                            console.log('🔍 CLIENT-DETAILS - item.id_fichas:', item.id_fichas);
                            console.log('🔍 CLIENT-DETAILS - tipo:', typeof item.id_fichas);
                            console.log('🔍 CLIENT-DETAILS - stack trace:', new Error().stack);
                            router.push(`/ficha-details/${item.id_fichas}`);
                          }}
                        >
                          <Text style={[styles.workoutName, { color: colors.text }]}>{item.fichas.nome_ficha}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteWorkoutButton}
                          onPress={() => handleDeleteWorkoutClick(item)}
                        >
                          <Trash2 size={16} color="white" />
                        </TouchableOpacity>
                      </View>
                      
                      <TouchableOpacity 
                        onPress={() => {
                          console.log('🔍 CLIENT-DETAILS - Segunda navegação para ficha-details');
                          console.log('🔍 CLIENT-DETAILS - item.id_fichas:', item.id_fichas);
                          console.log('🔍 CLIENT-DETAILS - tipo:', typeof item.id_fichas);
                          console.log('🔍 CLIENT-DETAILS - stack trace:', new Error().stack);
                          router.push(`/ficha-details/${item.id_fichas}`);
                        }}
                      >
                        <View style={styles.workoutDetails}>
                          <View style={styles.workoutDetail}>
                            <Calendar size={16} color={colors.primary} />
                            <Text style={[styles.workoutDetailText, { color: colors.textSecondary }]}>
                              Início: {item.data_inicio ? new Date(item.data_inicio).toLocaleDateString('pt-BR') : 'Não definido'}
                            </Text>
                          </View>
                          
                          <View style={styles.workoutDetail}>
                            <Calendar size={16} color={colors.primary} />
                            <Text style={[styles.workoutDetailText, { color: colors.textSecondary }]}>
                              Fim: {dataFim.toLocaleDateString('pt-BR')}
                            </Text>
                          </View>
                        </View>
                        
                        <View style={styles.workoutCardFooter}>
                          <Text 
                            style={[styles.workoutDescription, { color: colors.textSecondary }]}
                            numberOfLines={2}
                          >
                            {item.fichas.descricao || 'Sem descrição'}
                          </Text>
                          <ChevronRight size={20} color={colors.primary} />
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
              contentContainerStyle={styles.workoutsList}
            />
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
      
      {/* Modal de seleção de treinos */}
      <Modal
        visible={showAddWorkoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAddWorkoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Selecione um Treino</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => {
                  setShowAddWorkoutModal(false);
                  setSearchWorkout('');
                }}
              >
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            {/* Campo de pesquisa */}
            <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
              <Search size={20} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Buscar treino..."
                placeholderTextColor={colors.textSecondary}
                value={searchWorkout}
                onChangeText={setSearchWorkout}
              />
              {searchWorkout.length > 0 && (
                <TouchableOpacity onPress={() => setSearchWorkout('')}>
                  <X size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            
            {loading ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.modalLoadingText, { color: colors.textSecondary }]}>Carregando treinos...</Text>
              </View>
            ) : filteredWorkouts.length === 0 ? (
              <View style={styles.modalEmptyContainer}>
                <Dumbbell size={40} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                <Text style={[styles.modalEmptyText, { color: colors.textSecondary }]}>
                  {searchWorkout.length > 0 ? 'Nenhum treino encontrado' : 'Nenhum treino disponível'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredWorkouts}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={[styles.workoutListItem, { borderBottomColor: colors.border }]}
                    onPress={() => handleSelectWorkout(item.id)}
                  >
                    <View style={styles.workoutListItemContent}>
                      <Text style={[styles.workoutListItemTitle, { color: colors.text }]}>{item.nome_ficha}</Text>
                      {item.descricao && (
                        <Text 
                          style={[styles.workoutListItemDescription, { color: colors.textSecondary }]}
                          numberOfLines={1}
                        >
                          {item.descricao}
                        </Text>
                      )}
                      <View style={styles.workoutListItemMeta}>
                        {item.nivel && (
                          <View style={[styles.workoutListItemBadge, { backgroundColor: 'rgba(236, 72, 153, 0.1)' }]}>
                            <Text style={[styles.workoutListItemBadgeText, { color: colors.primary }]}>{item.nivel}</Text>
                          </View>
                        )}
                        {item.objetivo && (
                          <View style={[styles.workoutListItemBadge, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                            <Text style={[styles.workoutListItemBadgeText, { color: '#10B981' }]}>{item.objetivo}</Text>
                          </View>
                        )}
                        {item.duracao_treino && (
                          <View style={styles.workoutListItemDetail}>
                            <Clock size={12} color={colors.textSecondary} />
                            <Text style={[styles.workoutListItemDetailText, { color: colors.textSecondary }]}>{item.duracao_treino}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <ChevronRight size={20} color={colors.primary} />
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.workoutListContainer}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de confirmação de exclusão de treino */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.card, padding: 20 }]}>
            <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 16 }]}>Remover Treino</Text>
            
            <Text style={{ color: colors.textSecondary, fontFamily: 'Poppins-Regular', fontSize: 16, marginBottom: 24, textAlign: 'center' }}>
              Tem certeza que deseja remover {selectedWorkoutId ? workouts.find(w => w.id === selectedWorkoutId)?.fichas.nome_ficha : 'este treino'} da ficha da aluna?
            </Text>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: 'rgba(100, 100, 100, 0.1)', flex: 1, marginRight: 8 }]}
                onPress={() => {
                  setShowDeleteModal(false);
                  setSelectedWorkoutId(null);
                }}
                disabled={addingWorkout}
              >
                <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#EF4444', flex: 1, marginLeft: 8 }]}
                onPress={handleDeleteWorkout}
                disabled={addingWorkout}
              >
                {addingWorkout ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: 'white' }]}>Remover</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Toast ref={toastRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  section: {
    marginBottom: 20,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 30,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  profileName: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  editButtonText: {
    fontFamily: 'Poppins-Medium',
    color: 'white',
    fontSize: 14,
    marginLeft: 8,
  },
  contactInfo: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  contactText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    marginLeft: 12,
  },
  anamneseButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 20,
    flexDirection: 'row',
  },
  anamneseButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: 'white',
  },
  infoCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  infoCard: {
    width: '48%',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  infoLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    marginTop: 8,
  },
  infoValue: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
  },
  progressCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    marginBottom: 16,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  goalItem: {
    alignItems: 'center',
  },
  goalDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  goalLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    marginBottom: 4,
  },
  goalValue: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    textAlign: 'center',
  },
  chartCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
  },
  chartContainer: {
    alignItems: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  bottomPadding: {
    height: 100,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
  },
  emptyContainer: {
    marginHorizontal: 20,
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    marginTop: 12,
  },
  workoutsList: {
    paddingHorizontal: 20,
  },
  workoutCard: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  workoutCardContent: {
    padding: 16,
  },
  workoutCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  workoutName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    flex: 1,
  },
  workoutDetails: {
    marginBottom: 12,
  },
  workoutDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  workoutDetailText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    marginLeft: 8,
  },
  workoutCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 12,
  },
  workoutDescription: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  // Estilos do Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
  },
  modalLoadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  modalLoadingText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    marginTop: 12,
  },
  modalEmptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  modalEmptyText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    marginTop: 12,
  },
  workoutListContainer: {
    paddingBottom: 16,
  },
  workoutListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  workoutListItemContent: {
    flex: 1,
    marginRight: 8,
  },
  workoutListItemTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    marginBottom: 4,
  },
  workoutListItemDescription: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    marginBottom: 8,
  },
  workoutListItemMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  workoutListItemBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 4,
  },
  workoutListItemBadgeText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
  },
  workoutListItemDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  workoutListItemDetailText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    marginLeft: 4,
  },
  deleteWorkoutButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
  },
});
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Target, Plus, Calendar, Users, TrendingUp, X } from 'lucide-react-native';
import { router } from 'expo-router';

type Aluna = {
  user_id: string;
  nome: string;
  foto: string | null;
};

type Ciclo = {
  id: string;
  aluna_id: string;
  nome: string;
  data_inicio: string;
  data_fim: string;
  duracao_semanas: number;
  meta_treinos: number;
  ativo: boolean;
  aluna_nome?: string;
};

type CicloProgresso = {
  ciclo_id: string;
  aluna_id: string;
  ciclo_nome: string;
  data_inicio: string;
  data_fim: string;
  meta_treinos: number;
  total_checkins: number;
  faltam: number;
  percentual_conclusao: number;
  ativo: boolean;
};

export default function ManageCyclesScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [ciclos, setCiclos] = useState<CicloProgresso[]>([]);
  const [alunas, setAlunas] = useState<Aluna[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAluna, setSelectedAluna] = useState<string>('');
  
  // Form state
  const [nomeCiclo, setNomeCiclo] = useState('');
  const [duracaoSemanas, setDuracaoSemanas] = useState('5');
  const [metaTreinos, setMetaTreinos] = useState('25');
  const [dataInicio, setDataInicio] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Buscar alunas
      const { data: alunasData, error: alunasError } = await supabase
        .from('users')
        .select('user_id, nome, foto')
        .eq('admin', false)
        .order('nome');

      if (alunasError) throw alunasError;
      setAlunas(alunasData || []);

      // Buscar ciclos ativos com progresso
      const { data: ciclosData, error: ciclosError } = await supabase
        .from('ciclo_progresso')
        .select('*')
        .eq('ativo', true)
        .order('data_inicio', { ascending: false });

      if (ciclosError) throw ciclosError;

      // Adicionar nome da aluna a cada ciclo
      const ciclosComNome = await Promise.all(
        (ciclosData || []).map(async (ciclo) => {
          const aluna = alunasData?.find((a) => a.user_id === ciclo.aluna_id);
          return {
            ...ciclo,
            aluna_nome: aluna?.nome || 'Aluna',
          };
        })
      );

      setCiclos(ciclosComNome as any);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      Alert.alert('Erro', 'Não foi possível carregar os ciclos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCiclo = async () => {
    if (!selectedAluna || !nomeCiclo || !dataInicio) {
      Alert.alert('Atenção', 'Preencha todos os campos obrigatórios');
      return;
    }

    try {
      // Calcular data fim baseado na duração
      const inicio = new Date(dataInicio);
      const fim = new Date(inicio);
      fim.setDate(inicio.getDate() + parseInt(duracaoSemanas) * 7);

      // Desativar ciclo anterior se existir
      await supabase
        .from('ciclo_treino')
        .update({ ativo: false })
        .eq('aluna_id', selectedAluna)
        .eq('ativo', true);

      // Criar novo ciclo
      const { error } = await supabase.from('ciclo_treino').insert({
        aluna_id: selectedAluna,
        nome: nomeCiclo,
        data_inicio: dataInicio,
        data_fim: fim.toISOString().split('T')[0],
        duracao_semanas: parseInt(duracaoSemanas),
        meta_treinos: parseInt(metaTreinos),
        ativo: true,
      });

      if (error) throw error;

      Alert.alert('Sucesso', 'Ciclo criado com sucesso!');
      setModalVisible(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Erro ao criar ciclo:', error);
      Alert.alert('Erro', 'Não foi possível criar o ciclo');
    }
  };

  const handleFinalizarCiclo = async (cicloId: string) => {
    Alert.alert(
      'Finalizar Ciclo',
      'Deseja realmente finalizar este ciclo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Finalizar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('ciclo_treino')
                .update({ ativo: false })
                .eq('id', cicloId);

              if (error) throw error;

              Alert.alert('Sucesso', 'Ciclo finalizado!');
              fetchData();
            } catch (error) {
              console.error('Erro ao finalizar ciclo:', error);
              Alert.alert('Erro', 'Não foi possível finalizar o ciclo');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setSelectedAluna('');
    setNomeCiclo('');
    setDuracaoSemanas('5');
    setMetaTreinos('25');
    setDataInicio('');
  };

  const getStatusColor = (percentual: number) => {
    if (percentual >= 80) return '#10B981'; // Verde
    if (percentual >= 50) return '#F59E0B'; // Amarelo
    return '#EF4444'; // Vermelho
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Gerenciar Ciclos
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {ciclos.length} ciclo{ciclos.length !== 1 ? 's' : ''} ativo{ciclos.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setModalVisible(true)}
        >
          <Plus size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Ciclos List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {ciclos.length === 0 ? (
          <View style={styles.emptyState}>
            <Target size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Nenhum ciclo ativo
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Crie um novo ciclo para começar
            </Text>
          </View>
        ) : (
          ciclos.map((ciclo) => {
            const percentual = Math.min(ciclo.percentual_conclusao || 0, 100);
            const statusColor = getStatusColor(percentual);

            return (
              <View
                key={ciclo.ciclo_id}
                style={[styles.cicloCard, { backgroundColor: colors.card }]}
              >
                {/* Header do Card */}
                <View style={styles.cicloHeader}>
                  <View style={styles.cicloInfo}>
                    <Text style={[styles.alunaName, { color: colors.text }]}>
                      {(ciclo as any).aluna_nome}
                    </Text>
                    <Text style={[styles.cicloName, { color: colors.textSecondary }]}>
                      {ciclo.ciclo_nome}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleFinalizarCiclo(ciclo.ciclo_id)}
                    style={styles.finalizarButton}
                  >
                    <Text style={[styles.finalizarText, { color: colors.primary }]}>
                      Finalizar
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Progress */}
                <View style={styles.progressSection}>
                  <View style={styles.progressInfo}>
                    <Text style={[styles.progressText, { color: colors.text }]}>
                      {ciclo.total_checkins} / {ciclo.meta_treinos} treinos
                    </Text>
                    <Text style={[styles.percentText, { color: statusColor }]}>
                      {Math.round(percentual)}%
                    </Text>
                  </View>
                  <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        styles.progressFill,
                        { backgroundColor: statusColor, width: `${percentual}%` },
                      ]}
                    />
                  </View>
                </View>

                {/* Stats */}
                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <Calendar size={16} color={colors.textSecondary} />
                    <Text style={[styles.statText, { color: colors.textSecondary }]}>
                      {ciclo.duracao_semanas || 5} semanas
                    </Text>
                  </View>
                  <View style={styles.stat}>
                    <TrendingUp size={16} color={colors.textSecondary} />
                    <Text style={[styles.statText, { color: colors.textSecondary }]}>
                      Faltam {ciclo.faltam} treinos
                    </Text>
                  </View>
                </View>

                {/* Datas */}
                <Text style={[styles.datesText, { color: colors.textSecondary }]}>
                  {new Date(ciclo.data_inicio).toLocaleDateString('pt-BR')} -{' '}
                  {new Date(ciclo.data_fim).toLocaleDateString('pt-BR')}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Modal Criar Ciclo */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Novo Ciclo
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Selecionar Aluna */}
              <Text style={[styles.label, { color: colors.text }]}>Aluna *</Text>
              <View style={styles.pickerContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.alunasList}
                >
                  {alunas.map((aluna) => (
                    <TouchableOpacity
                      key={aluna.user_id}
                      style={[
                        styles.alunaChip,
                        {
                          backgroundColor:
                            selectedAluna === aluna.user_id
                              ? colors.primary
                              : colors.border + '40',
                        },
                      ]}
                      onPress={() => setSelectedAluna(aluna.user_id)}
                    >
                      <Text
                        style={[
                          styles.alunaChipText,
                          {
                            color:
                              selectedAluna === aluna.user_id ? 'white' : colors.text,
                          },
                        ]}
                      >
                        {aluna.nome}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Nome do Ciclo */}
              <Text style={[styles.label, { color: colors.text }]}>Nome do Ciclo *</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.background, color: colors.text },
                ]}
                placeholder="Ex: Ciclo 1 - Dezembro 2025"
                placeholderTextColor={colors.textSecondary}
                value={nomeCiclo}
                onChangeText={setNomeCiclo}
              />

              {/* Data Início */}
              <Text style={[styles.label, { color: colors.text }]}>Data de Início *</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.background, color: colors.text },
                ]}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={colors.textSecondary}
                value={dataInicio}
                onChangeText={setDataInicio}
              />

              {/* Duração */}
              <Text style={[styles.label, { color: colors.text }]}>Duração (semanas)</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.background, color: colors.text },
                ]}
                placeholder="5"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={duracaoSemanas}
                onChangeText={setDuracaoSemanas}
              />

              {/* Meta */}
              <Text style={[styles.label, { color: colors.text }]}>Meta de Treinos</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.background, color: colors.text },
                ]}
                placeholder="25"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={metaTreinos}
                onChangeText={setMetaTreinos}
              />

              <TouchableOpacity
                style={[styles.createButton, { backgroundColor: colors.primary }]}
                onPress={handleCreateCiclo}
              >
                <Text style={styles.createButtonText}>Criar Ciclo</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
  },
  headerSubtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    marginTop: 4,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    marginTop: 16,
  },
  emptySubtext: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    marginTop: 8,
  },
  cicloCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cicloHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cicloInfo: {
    flex: 1,
  },
  alunaName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
  },
  cicloName: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    marginTop: 4,
  },
  finalizarButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  finalizarText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
  },
  percentText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
  },
  datesText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
  },
  modalBody: {
    padding: 20,
  },
  label: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
  },
  pickerContainer: {
    marginBottom: 8,
  },
  alunasList: {
    flexDirection: 'row',
  },
  alunaChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
  },
  alunaChipText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
  },
  createButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  createButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: 'white',
  },
});

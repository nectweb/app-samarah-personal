import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ChevronLeft,
  Plus,
  Trash2,
  Search,
  X,
  Dumbbell,
  Clock,
  ChevronRight,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

// Interfaces
interface Ficha {
  id: number;
  nome_ficha: string;
  descricao: string | null;
  created_at: string;
}

interface WorkoutPlan {
  id_fichas_treino: string;
  nome: string;
  descricao: string | null;
  nivel: 'iniciante' | 'intermediário' | 'avançado' | null;
  objetivo:
    | 'Hipertrofia'
    | 'Força'
    | 'Emagrecimento'
    | 'Resistência'
    | 'Condicionamento'
    | null;
  duracao_treino: string | null;
  modalidade: string | null;
  exercicios_count?: number;
  sessao?: string;
}

export default function FichaDetailsScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams();
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingWorkouts, setLoadingWorkouts] = useState(true);
  const [showAddWorkoutModal, setShowAddWorkoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState<string | null>(null);
  const [availableWorkouts, setAvailableWorkouts] = useState<WorkoutPlan[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredWorkouts, setFilteredWorkouts] = useState<WorkoutPlan[]>([]);
  const [selectedSessao, setSelectedSessao] = useState<string>('A');
  const [usedSessions, setUsedSessions] = useState<string[]>([]);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchFichaDetails();
      fetchFichaWorkouts();
    }
  }, [id]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredWorkouts(availableWorkouts);
    } else {
      const filtered = availableWorkouts.filter(
        (workout) =>
          workout.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (workout.descricao &&
            workout.descricao.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredWorkouts(filtered);
    }
  }, [searchQuery, availableWorkouts]);

  const fetchFichaDetails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fichas')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setFicha(data);
    } catch (error) {
      console.error('Erro ao buscar detalhes da ficha:', error);
      alert('Erro ao carregar detalhes da ficha');
    } finally {
      setLoading(false);
    }
  };

  const fetchFichaWorkouts = async () => {
    setLoadingWorkouts(true);
    try {
      // Buscar treinos associados a esta ficha
      const { data, error } = await supabase
        .from('fichas_treino')
        .select(
          `
          id,
          treinos_id,
          sessao,
          treinos!inner(id_fichas_treino, nome, descricao, nivel, objetivo, duracao_treino, modalidade),
          treino_exercicios:treinos!inner(id_fichas_treino, treino_exercicios(count))
        `
        )
        .eq('fichas_id', id);

      if (error) throw error;

      // Formatar os dados para o formato esperado
      const formattedWorkouts =
        data?.map((item: any) => ({
          id_fichas_treino: item.treinos?.id_fichas_treino || '',
          nome: item.treinos?.nome || '',
          descricao: item.treinos?.descricao || null,
          nivel: item.treinos?.nivel || null,
          objetivo: item.treinos?.objetivo || null,
          duracao_treino: item.treinos?.duracao_treino || null,
          modalidade: item.treinos?.modalidade || null,
            exercicios_count:
            item.treino_exercicios?.treino_exercicios?.[0]?.count || 0,
          sessao: item.sessao || 'A',
        })) || [];

      // Obter todas as sessões já utilizadas
      const sessionsInUse = formattedWorkouts.map(
        (workout) => workout.sessao as string
      );
      setUsedSessions(sessionsInUse);

      setWorkouts(formattedWorkouts);
    } catch (error) {
      console.error('Erro ao buscar treinos da ficha:', error);
    } finally {
      setLoadingWorkouts(false);
    }
  };

  const fetchAvailableWorkouts = async () => {
    try {
      // Buscar todos os treinos disponíveis
      const { data: allWorkouts, error: allWorkoutsError } = await supabase
        .from('treinos')
        .select(
          `
          id_fichas_treino,
          nome,
          descricao,
          nivel,
          objetivo,
          duracao_treino,
          modalidade,
          treino_exercicios(count)
        `
        )
        .eq('status', true)
        .order('nome');

      if (allWorkoutsError) throw allWorkoutsError;

      // Buscar treinos já associados a esta ficha
      const { data: associatedWorkouts, error: associatedError } =
        await supabase
          .from('fichas_treino')
          .select('treinos_id')
          .eq('fichas_id', id);

      if (associatedError) throw associatedError;

      // Filtrar treinos que ainda não estão associados a esta ficha
      const associatedIds =
        associatedWorkouts?.map((item) => item.treinos_id) || [];
      const availableWorkoutsFiltered =
        allWorkouts
          ?.filter(
            (workout) => !associatedIds.includes(workout.id_fichas_treino)
          )
          .map((workout) => ({
            ...workout,
            exercicios_count: workout.treino_exercicios[0].count,
          })) || [];

      setAvailableWorkouts(availableWorkoutsFiltered);
      setFilteredWorkouts(availableWorkoutsFiltered);
    } catch (error) {
      console.error('Erro ao buscar treinos disponíveis:', error);
    }
  };

  const handleAddWorkoutClick = () => {
    fetchAvailableWorkouts();

    // Encontrar a primeira sessão disponível para selecionar por padrão
    const availableSessions = ['A', 'B', 'C', 'D', 'E'].filter(
      (s) => !usedSessions.includes(s)
    );

    if (availableSessions.length > 0) {
      setSelectedSessao(availableSessions[0]);
      setSessionError(null);
    } else {
      // Se todas as sessões estiverem em uso, manter 'A' mas mostrar erro
      setSelectedSessao('A');
      setSessionError('Todas as sessões já estão em uso nesta ficha.');
    }

    setShowAddWorkoutModal(true);
  };

  const handleSelectWorkout = async (workoutId: string) => {
    try {
      // Verificar se a sessão já está em uso
      if (usedSessions.includes(selectedSessao)) {
        setSessionError(
          `A sessão ${selectedSessao} já está em uso. Por favor, escolha outra sessão.`
        );
        return;
      }

      const { error } = await supabase.from('fichas_treino').insert([
        {
          fichas_id: id,
          treinos_id: workoutId,
          sessao: selectedSessao,
        },
      ]);

      if (error) throw error;

      // Atualizar a lista de sessões usadas
      setUsedSessions([...usedSessions, selectedSessao]);

      // Atualizar a lista de treinos
      await fetchFichaWorkouts();
      setShowAddWorkoutModal(false);
      setSearchQuery('');
      setSelectedSessao('A'); // Reset para o valor padrão
      setSessionError(null);
    } catch (error) {
      console.error('Erro ao adicionar treino à ficha:', error);
      alert('Erro ao adicionar treino à ficha. Tente novamente.');
    }
  };

  const handleDeleteWorkout = async () => {
    if (!workoutToDelete) return;

    try {
      // Encontrar a sessão do treino que será excluído
      const workoutToRemove = workouts.find(
        (w) => w.id_fichas_treino === workoutToDelete
      );
      const sessionToRemove = workoutToRemove?.sessao;

      const { error } = await supabase
        .from('fichas_treino')
        .delete()
        .eq('fichas_id', id)
        .eq('treinos_id', workoutToDelete);

      if (error) throw error;

      // Atualizar a lista de treinos
      setWorkouts(
        workouts.filter(
          (workout) => workout.id_fichas_treino !== workoutToDelete
        )
      );

      // Atualizar a lista de sessões usadas
      if (sessionToRemove) {
        setUsedSessions(usedSessions.filter((s) => s !== sessionToRemove));
      }

      setShowDeleteModal(false);
      setWorkoutToDelete(null);
    } catch (error) {
      console.error('Erro ao remover treino da ficha:', error);
      alert('Erro ao remover treino da ficha. Tente novamente.');
    }
  };

  const renderWorkoutItem = ({ item }: { item: WorkoutPlan }) => (
    <View style={[styles.workoutCard, { backgroundColor: colors.card }]}>
      <TouchableOpacity
        style={styles.workoutContent}
        onPress={() => router.push(`/workout-details/${item.id_fichas_treino}`)}
      >
        <View style={styles.workoutTitleContainer}>
          <View style={styles.workoutTitleSection}>
            <View
              style={[
                styles.sessaoBadge,
                { backgroundColor: getSessaoColor(item.sessao || 'A') },
              ]}
            >
              <Text style={[styles.sessaoBadgeText, { color: 'white' }]}>
                {item.sessao || 'A'}
              </Text>
            </View>
            <Text style={[styles.workoutTitle, { color: colors.text }]}>
              {item.nome}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.deleteButton,
              { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
            ]}
            onPress={() => {
              setWorkoutToDelete(item.id_fichas_treino);
              setShowDeleteModal(true);
            }}
          >
            <Trash2 size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {item.descricao && (
          <Text
            style={[styles.workoutDescription, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {item.descricao}
          </Text>
        )}

        <View style={styles.workoutMetaContainer}>
          <View style={styles.workoutMeta}>
            <Clock size={16} color={colors.primary} />
            <Text
              style={[styles.workoutMetaText, { color: colors.textSecondary }]}
            >
              {item.duracao_treino}
            </Text>
          </View>

          <View style={styles.workoutMeta}>
            <Dumbbell size={16} color={colors.primary} />
            <Text
              style={[styles.workoutMetaText, { color: colors.textSecondary }]}
            >
              {item.exercicios_count} exercícios
            </Text>
          </View>
        </View>

        <View style={styles.workoutFooter}>
          <View
            style={[
              styles.levelBadge,
              { backgroundColor: 'rgba(236, 72, 153, 0.1)' },
            ]}
          >
            <Text style={[styles.levelText, { color: colors.primary }]}>
              {item.nivel}
            </Text>
          </View>

          <View style={styles.workoutActions}>
            <View style={styles.detailsButton}>
              <Text style={[styles.detailsText, { color: colors.primary }]}>
                Ver Detalhes
              </Text>
              <ChevronRight size={16} color={colors.primary} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderAvailableWorkoutItem = ({ item }: { item: WorkoutPlan }) => (
    <TouchableOpacity
      style={[styles.availableWorkoutItem, { backgroundColor: colors.card }]}
      onPress={() => handleSelectWorkout(item.id_fichas_treino)}
    >
      <View style={styles.availableWorkoutContent}>
        <Text style={[styles.availableWorkoutTitle, { color: colors.text }]}>
          {item.nome}
        </Text>
        {item.descricao && (
          <Text
            style={[
              styles.availableWorkoutDescription,
              { color: colors.textSecondary },
            ]}
            numberOfLines={1}
          >
            {item.descricao}
          </Text>
        )}
        <View style={styles.availableWorkoutMeta}>
          <Text
            style={[
              styles.availableWorkoutMetaText,
              { color: colors.textSecondary },
            ]}
          >
            {item.nivel} • {item.objetivo} • {item.exercicios_count} exercícios
          </Text>
        </View>
      </View>
      <Plus size={20} color={colors.primary} />
    </TouchableOpacity>
  );

  // Função para obter cor da sessão
  const getSessaoColor = (sessao: string): string => {
    switch (sessao) {
      case 'A':
        return '#EC4899'; // Rosa
      case 'B':
        return '#3B82F6'; // Azul
      case 'C':
        return '#10B981'; // Verde
      case 'D':
        return '#F59E0B'; // Amarelo
      case 'E':
        return '#8B5CF6'; // Roxo
      default:
        return '#6B7280'; // Cinza
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Carregando...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Botão de voltar */}
      <TouchableOpacity
        style={[styles.backButton, { backgroundColor: colors.card }]}
        onPress={() => router.back()}
      >
        <ChevronLeft size={20} color={colors.text} />
      </TouchableOpacity>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            {ficha?.nome_ficha}
          </Text>
        </View>

        {ficha?.descricao && (
          <View style={styles.descriptionContainer}>
            <Text style={[styles.descriptionTitle, { color: colors.text }]}>
              Descrição
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {ficha.descricao}
            </Text>
          </View>
        )}

        <View style={styles.workoutsHeader}>
          <Text style={[styles.workoutsTitle, { color: colors.text }]}>
            Treinos
          </Text>
          <TouchableOpacity
            style={[
              styles.addWorkoutButton,
              { backgroundColor: colors.primary },
            ]}
            onPress={handleAddWorkoutClick}
          >
            <Plus size={16} color="white" />
            <Text style={styles.addWorkoutButtonText}>Adicionar Treino</Text>
          </TouchableOpacity>
        </View>

        {loadingWorkouts ? (
          <View style={styles.loadingWorkoutsContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text
              style={[
                styles.loadingWorkoutsText,
                { color: colors.textSecondary },
              ]}
            >
              Carregando treinos...
            </Text>
          </View>
        ) : workouts.length === 0 ? (
          <View style={styles.emptyWorkoutsContainer}>
            <Text
              style={[
                styles.emptyWorkoutsText,
                { color: colors.textSecondary },
              ]}
            >
              Esta ficha ainda não possui treinos associados.
            </Text>
            <TouchableOpacity
              style={[
                styles.emptyWorkoutsButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={handleAddWorkoutClick}
            >
              <Text style={styles.emptyWorkoutsButtonText}>
                Adicionar Treino
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={workouts}
            renderItem={renderWorkoutItem}
            keyExtractor={(item) => item.id_fichas_treino}
            contentContainerStyle={styles.workoutsList}
            scrollEnabled={false}
          />
        )}
      </ScrollView>

      {/* Modal para adicionar treino */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAddWorkoutModal}
        onRequestClose={() => {
          setShowAddWorkoutModal(false);
          setSearchQuery('');
          setSelectedSessao('A');
        }}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Adicionar Treino à Ficha
              </Text>
              <TouchableOpacity
                style={[
                  styles.closeButton,
                  { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
                ]}
                onPress={() => {
                  setShowAddWorkoutModal(false);
                  setSearchQuery('');
                  setSelectedSessao('A');
                }}
              >
                <X size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.searchInputContainer,
                { backgroundColor: colors.background },
              ]}
            >
              <Search
                size={20}
                color={colors.textSecondary}
                style={styles.searchIcon}
              />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Pesquisar treinos..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  style={styles.clearButton}
                >
                  <X size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.sessaoSelector}>
              <Text style={[styles.sessaoLabel, { color: colors.text }]}>
                Selecione a sessão:
              </Text>
              <View style={styles.sessaoButtonsContainer}>
                {['A', 'B', 'C', 'D', 'E'].map((sessao) => (
                  <TouchableOpacity
                    key={sessao}
                    style={[
                      styles.sessaoButton,
                      usedSessions.includes(sessao) && sessao !== selectedSessao
                        ? styles.sessaoButtonDisabled
                        : selectedSessao === sessao
                        ? { backgroundColor: colors.primary }
                        : { backgroundColor: colors.background },
                    ]}
                    onPress={() => {
                      if (
                        !usedSessions.includes(sessao) ||
                        sessao === selectedSessao
                      ) {
                        setSelectedSessao(sessao);
                        setSessionError(null);
                      }
                    }}
                    disabled={
                      usedSessions.includes(sessao) && sessao !== selectedSessao
                    }
                  >
                    <Text
                      style={[
                        styles.sessaoButtonText,
                        usedSessions.includes(sessao) &&
                        sessao !== selectedSessao
                          ? styles.sessaoButtonTextDisabled
                          : selectedSessao === sessao
                          ? { color: 'white' }
                          : { color: colors.text },
                      ]}
                    >
                      {sessao}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {sessionError && (
                <Text style={styles.sessionErrorText}>{sessionError}</Text>
              )}
            </View>

            <FlatList
              data={filteredWorkouts}
              renderItem={renderAvailableWorkoutItem}
              keyExtractor={(item) => item.id_fichas_treino}
              contentContainerStyle={styles.availableWorkoutsList}
              ListEmptyComponent={
                <View style={styles.emptyAvailableWorkouts}>
                  <Text
                    style={[
                      styles.emptyAvailableWorkoutsText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {searchQuery
                      ? 'Nenhum treino encontrado'
                      : 'Todos os treinos já estão associados a esta ficha'}
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Modal para confirmar exclusão */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showDeleteModal}
        onRequestClose={() => {
          setShowDeleteModal(false);
          setWorkoutToDelete(null);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Confirmar Remoção
            </Text>
            <Text style={[styles.modalText, { color: colors.textSecondary }]}>
              Tem certeza que deseja remover este treino da ficha? Esta ação não
              exclui o treino do sistema.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
                ]}
                onPress={() => {
                  setShowDeleteModal(false);
                  setWorkoutToDelete(null);
                }}
              >
                <Text style={[styles.modalButtonText, { color: '#EF4444' }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={handleDeleteWorkout}
              >
                <Text style={[styles.modalButtonText, { color: 'white' }]}>
                  Confirmar
                </Text>
              </TouchableOpacity>
            </View>
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
  content: {
    flex: 1,
    paddingTop: 120,
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 28,
  },
  descriptionContainer: {
    marginBottom: 24,
  },
  descriptionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    marginBottom: 8,
  },
  description: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    lineHeight: 22,
  },
  workoutsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  workoutsTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
  },
  addWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addWorkoutButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: 'white',
    marginLeft: 4,
  },
  loadingWorkoutsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingWorkoutsText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    marginTop: 8,
  },
  emptyWorkoutsContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  emptyWorkoutsText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyWorkoutsButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyWorkoutsButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: 'white',
  },
  workoutsList: {
    paddingBottom: 100,
  },
  workoutCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  workoutContent: {
    padding: 16,
  },
  workoutTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  workoutTitleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sessaoBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sessaoBadgeText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 14,
  },
  workoutTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    flex: 1,
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 12,
  },
  workoutDescription: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    marginBottom: 12,
  },
  workoutMetaContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  workoutMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  workoutMetaText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    marginLeft: 4,
  },
  workoutFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
  },
  workoutActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    marginRight: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
  },
  clearButton: {
    padding: 4,
  },
  availableWorkoutsList: {
    paddingBottom: 20,
  },
  availableWorkoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  availableWorkoutContent: {
    flex: 1,
  },
  availableWorkoutTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    marginBottom: 4,
  },
  availableWorkoutDescription: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    marginBottom: 8,
  },
  availableWorkoutMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availableWorkoutMetaText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
  },
  emptyAvailableWorkouts: {
    padding: 20,
    alignItems: 'center',
  },
  emptyAvailableWorkoutsText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    textAlign: 'center',
  },
  modalText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
  },
  loadingText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    marginTop: 12,
  },
  sessaoSelector: {
    marginBottom: 16,
  },
  sessaoLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    marginBottom: 8,
  },
  sessaoButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sessaoButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  sessaoButtonText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
  },
  sessaoButtonDisabled: {
    backgroundColor: 'rgba(100, 100, 100, 0.1)',
    opacity: 0.5,
  },
  sessaoButtonTextDisabled: {
    color: 'rgba(100, 100, 100, 0.5)',
  },
  sessionErrorText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#EF4444',
    marginTop: 8,
    textAlign: 'center',
  },
});

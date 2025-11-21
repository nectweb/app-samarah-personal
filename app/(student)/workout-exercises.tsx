import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  FlatList,
  Modal,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import {
  ChevronLeft,
  Dumbbell,
  Weight,
  Check,
  MessageSquare,
  Play,
  CheckCircle,
  PlayCircle,
  ArrowLeft,
} from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { supabase } from '@/lib/supabase';

interface Exercise {
  id: string;
  nome: string;
  descricao: string | null;
  instrucoes: string | null;
  series: number;
  repeticoes: number | null;
  tempo_descanso: number | null;
  cadencia: string | null;
  ordem: number;
    equipamento_necessario: string | null;
    url_video: string | null;
  concluido: boolean;
  observacoes: string;
}

interface WorkoutDetails {
  id: string;
  nome: string;
  descricao: string | null;
  nivel: string | null;
  objetivo: string | null;
  duracao_treino: string | null;
  modalidade: string | null;
  grupo_muscular_principal: string | null;
}

export default function WorkoutExercisesScreen() {
  const { colors: themeColors } = useTheme();
  const colors = {
    ...themeColors,
    cardBackground: themeColors.card,
    success: '#10B981',
    error: '#EF4444',
    secondary: '#6B7280',
  };
  const { user } = useAuth();
  const { treino_id } = useLocalSearchParams<{ treino_id: string }>();

  const [workoutDetails, setWorkoutDetails] = useState<WorkoutDetails | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [autoStart, setAutoStart] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());

  useEffect(() => {
    console.log('🔍 WORKOUT-EXERCISES - useEffect executado');
    console.log('🔍 WORKOUT-EXERCISES - treino_id:', treino_id);
    console.log('🔍 WORKOUT-EXERCISES - tipo:', typeof treino_id);
    console.log('🔍 WORKOUT-EXERCISES - stack trace:', new Error().stack);
    
    if (treino_id) {
      fetchWorkoutDetails();
      fetchExercises();
    }
  }, [treino_id]);

  const fetchWorkoutDetails = async () => {
    try {
      console.log('🔍 Buscando detalhes do treino:', treino_id);

      const { data: treino, error: treinoError } = await supabase
        .from('treinos')
        .select('*')
        .eq('id_fichas_treino', treino_id)
        .single();

      if (treinoError) {
        console.error('Erro ao buscar treino:', treinoError);
        throw treinoError;
      }

      if (!treino) {
        throw new Error('Treino não encontrado');
      }

      console.log('✅ Treino encontrado:', treino.nome);

      const grupoMuscularPrincipal = determineMainMuscleGroup(treino.nome);

      const workoutData: WorkoutDetails = {
        id: treino.id_fichas_treino,
        nome: treino.nome || 'Treino sem nome',
        descricao: treino.descricao,
        nivel: treino.nivel,
        objetivo: treino.objetivo,
        duracao_treino: treino.duracao_treino,
        modalidade: treino.modalidade,
        grupo_muscular_principal: grupoMuscularPrincipal,
      };

      setWorkoutDetails(workoutData);
    } catch (error: any) {
      console.error('Erro ao buscar detalhes do treino:', error);
      setError(error.message || 'Erro ao carregar detalhes do treino');
    }
  };

  const determineMainMuscleGroup = (treinoNome: string): string => {
    if (!treinoNome) return 'Full Body';

    const nome = treinoNome.toLowerCase();

    const muscleGroups = {
      'peito': ['peito', 'chest', 'pectoral'],
      'costas': ['costas', 'back', 'dorsal'],
      'pernas': ['pernas', 'legs', 'quadríceps', 'posterior', 'glúteos'],
      'ombros': ['ombros', 'shoulders', 'deltóides'],
      'bíceps': ['bíceps', 'biceps', 'braço'],
      'tríceps': ['tríceps', 'triceps'],
      'abdômen': ['abdômen', 'abdomem', 'core', 'abs'],
      'cardio': ['cardio', 'aeróbico', 'hiit'],
    };

    const frequency: { [key: string]: number } = {};

    Object.entries(muscleGroups).forEach(([grupo, palavras]) => {
      frequency[grupo] = palavras.reduce((count, palavra) => {
        return count + (nome.includes(palavra) ? 1 : 0);
      }, 0);
    });

    const grupoMaisFrequente = Object.entries(frequency).reduce(
      (max, [grupo, freq]) => (freq > max.freq ? { grupo, freq } : max),
      { grupo: 'full body', freq: 0 }
    ).grupo;

    if (grupoMaisFrequente === 'full body' && frequency['full body'] === 0) {
      return 'Full Body';
    }

    return grupoMaisFrequente
      ? grupoMaisFrequente.charAt(0).toUpperCase() + grupoMaisFrequente.slice(1)
      : 'Full Body';
  };

  const fetchExercises = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Buscando exercícios para treino_id:', treino_id);

      // Validação do treino_id
      if (!treino_id) {
        throw new Error('ID do treino não fornecido');
      }

      // Verificar se treino_id é um UUID válido
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(treino_id);
      if (!isUUID) {
        throw new Error('ID do treino inválido. Deve ser um UUID válido.');
      }

      // Buscar exercícios diretamente usando a relação correta
      // ficha_id referencia treinos.id_fichas_treino
            const { data: exercicios, error: exerciciosError } = await supabase
              .from('treino_exercicios')
              .select(`
          id,
          ficha_id,
          exercicio_id,
          series,
          repeticoes,
          tempo_descanso,
          cadencia,
          ordem,
          sessao_id,
            exercicios_biblioteca!exercicio_id (
              id,
              nome,
              descricao,
              equipamento_necessario,
              url_video
            )
          `)
        .eq('ficha_id', treino_id) // ficha_id referencia treinos.id_fichas_treino
          .order('ordem', { ascending: true });

      if (exerciciosError) {
        console.error('Erro ao buscar exercícios:', exerciciosError);
        throw new Error(`Erro ao buscar exercícios: ${exerciciosError.message}`);
      }

      if (!exercicios || exercicios.length === 0) {
        console.log('⚠️ Nenhum exercício encontrado para este treino');
          setExercises([]);
          return;
      }

      console.log('✅ Exercícios encontrados:', exercicios.length);

      // Formatar os exercícios
      const formattedExercises: Exercise[] = exercicios.map((item: any) => {
        const exercicio = item.exercicios_biblioteca || {};

        return {
          id: exercicio.id || item.id || '',
          nome: exercicio.nome || 'Exercício sem nome',
          descricao: exercicio.descricao || null,
          instrucoes: null,
          series: item.series || 0,
          repeticoes: item.repeticoes ? parseInt(item.repeticoes) : null,
          tempo_descanso: item.tempo_descanso ? parseInt(item.tempo_descanso) : null,
          cadencia: item.cadencia || null,
          ordem: item.ordem || 0,
          equipamento_necessario: exercicio.equipamento_necessario || null,
          url_video: exercicio.url_video || null,
          concluido: false,
          observacoes: '',
        };
      });

      console.log('✅ Exercícios formatados:', formattedExercises.length);
      setExercises(formattedExercises);

    } catch (error: any) {
      console.error('❌ Erro ao buscar exercícios:', error);
      setError(error.message || 'Erro ao carregar exercícios');
    } finally {
      setLoading(false);
    }
  };

  const handleExerciseComplete = (exerciseId: string) => {
    setCompletedExercises(prev => {
      const newSet = new Set(prev);
      if (newSet.has(exerciseId)) {
        newSet.delete(exerciseId);
      } else {
        newSet.add(exerciseId);
      }
      return newSet;
    });
  };

  const handleNotesPress = (exerciseId: string) => {
    const exercise = exercises.find(ex => ex.id === exerciseId);
    setNotes(exercise?.observacoes || '');
    setSelectedExerciseId(exerciseId);
    setShowNotesModal(true);
  };

  const handleSaveNotes = () => {
    if (selectedExerciseId) {
      setExercises(prev => prev.map(ex => 
        ex.id === selectedExerciseId 
          ? { ...ex, observacoes: notes }
          : ex
      ));
    }
    setShowNotesModal(false);
    setSelectedExerciseId(null);
    setNotes('');
  };

  const handleStartWorkout = () => {
    setIsWorkoutActive(true);
    setCurrentExerciseIndex(0);
    setCompletedExercises(new Set());
  };

  const handleEndWorkout = () => {
    setIsWorkoutActive(false);
    setCurrentExerciseIndex(0);
    setCompletedExercises(new Set());
  };

  const handleNextExercise = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
    } else {
      handleEndWorkout();
    }
  };

  const handlePreviousExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(prev => prev - 1);
    }
  };

  const handleVideoPress = (url: string) => {
    setSelectedVideoUrl(url);
    setShowVideoModal(true);
  };

  const renderExercise = ({ item, index }: { item: Exercise; index: number }) => {
    const isCompleted = completedExercises.has(item.id);
    const isCurrentExercise = isWorkoutActive && currentExerciseIndex === index;

              return (
                <View
                  style={[
          styles.exerciseCard,
          {
            backgroundColor: colors.cardBackground,
            borderColor: colors.border,
            ...(isCurrentExercise && {
              borderColor: colors.primary,
              borderWidth: 2,
            }),
            ...(isCompleted && {
              backgroundColor: colors.success + '20',
              borderColor: colors.success,
            }),
                    },
                  ]}
                >
        <View style={styles.exerciseHeader}>
          <View style={styles.exerciseInfo}>
            <Text style={[styles.exerciseName, { color: colors.text }]}>
              {item.nome}
                        </Text>
            {item.descricao && (
              <Text style={[styles.exerciseDescription, { color: colors.textSecondary }]}>
                {item.descricao}
                        </Text>
                      )}
                        </View>
          <View style={styles.exerciseActions}>
            {item.url_video && (
                    <TouchableOpacity
                onPress={() => handleVideoPress(item.url_video!)}
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
              >
                <Play size={20} color="white" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => handleNotesPress(item.id)}
              style={[styles.actionButton, { backgroundColor: colors.secondary }]}
            >
              <MessageSquare size={20} color="white" />
                    </TouchableOpacity>
          </View>
                  </View>

        <View style={styles.exerciseDetails}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              Séries:
                          </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {item.series}
                          </Text>
                        </View>
          {item.repeticoes && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Repetições:
                          </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {item.repeticoes}
                          </Text>
                        </View>
                      )}
          {item.tempo_descanso && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Descanso:
                          </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {item.tempo_descanso}s
                          </Text>
                        </View>
                      )}
          {item.cadencia && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Cadência:
                          </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {item.cadencia}
                          </Text>
                        </View>
                      )}
          {item.equipamento_necessario && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Equipamento:
                          </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {item.equipamento_necessario}
                          </Text>
                        </View>
                      )}
                  </View>

        {isWorkoutActive && (
          <View style={styles.workoutControls}>
                    <TouchableOpacity
              onPress={() => handleExerciseComplete(item.id)}
                        style={[
                styles.completeButton,
                {
                  backgroundColor: isCompleted ? colors.success : colors.primary,
                },
              ]}
            >
              {isCompleted ? (
                <CheckCircle size={20} color="white" />
              ) : (
                <Check size={20} color="white" />
              )}
              <Text style={styles.completeButtonText}>
                {isCompleted ? 'Concluído' : 'Marcar como Concluído'}
                      </Text>
                    </TouchableOpacity>
          </View>
        )}

        {item.observacoes && (
          <View style={styles.notesContainer}>
            <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>
              Observações:
                        </Text>
            <Text style={[styles.notesText, { color: colors.text }]}>
              {item.observacoes}
            </Text>
          </View>
                    )}
                </View>
              );
  };

  const renderWorkoutMode = () => {
    if (!isWorkoutActive || exercises.length === 0) return null;

    const currentExercise = exercises[currentExerciseIndex];
    const progress = ((currentExerciseIndex + 1) / exercises.length) * 100;

    return (
      <View style={[styles.workoutMode, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.workoutHeader}>
          <Text style={[styles.workoutTitle, { color: colors.text }]}>
            Modo Treino Ativo
                    </Text>
          <TouchableOpacity
            onPress={handleEndWorkout}
            style={[styles.endButton, { backgroundColor: colors.error }]}
          >
            <Text style={styles.endButtonText}>Finalizar</Text>
          </TouchableOpacity>
                  </View>

        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        styles.progressFill,
                { backgroundColor: colors.primary, width: `${progress}%` },
                      ]}
                    />
                  </View>
          <Text style={[styles.progressText, { color: colors.text }]}>
            {currentExerciseIndex + 1} de {exercises.length}
                  </Text>
                </View>

        <View style={styles.currentExercise}>
          <Text style={[styles.currentExerciseName, { color: colors.text }]}>
            {currentExercise.nome}
          </Text>
          <Text style={[styles.currentExerciseDetails, { color: colors.textSecondary }]}>
            {currentExercise.series} séries × {currentExercise.repeticoes || 'N/A'} reps
          </Text>
        </View>

        <View style={styles.workoutNavigation}>
                        <TouchableOpacity
            onPress={handlePreviousExercise}
            disabled={currentExerciseIndex === 0}
                          style={[
              styles.navButton,
              {
                backgroundColor: currentExerciseIndex === 0 ? colors.border : colors.primary,
              },
            ]}
          >
            <ArrowLeft size={20} color="white" />
            <Text style={styles.navButtonText}>Anterior</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleNextExercise}
            style={[styles.navButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.navButtonText}>
              {currentExerciseIndex === exercises.length - 1 ? 'Finalizar' : 'Próximo'}
                          </Text>
            <ArrowLeft size={20} color="white" style={{ transform: [{ rotate: '180deg' }] }} />
                        </TouchableOpacity>
                  </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: colors.cardBackground }]}
          >
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Carregando...
                  </Text>
                </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Carregando exercícios...
          </Text>
                </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: colors.cardBackground }]}
          >
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Erro
                </Text>
              </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error}
          </Text>
                <TouchableOpacity
                  onPress={() => {
              setError(null);
              fetchExercises();
            }}
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.retryButtonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: colors.cardBackground }]}
        >
          <ChevronLeft size={24} color={colors.text} />
                </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Exercícios
        </Text>
              </View>

      {workoutDetails && (
        <View style={[styles.workoutInfo, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.workoutName, { color: colors.text }]}>
            {workoutDetails.nome}
          </Text>
          {workoutDetails.descricao && (
            <Text style={[styles.workoutDescription, { color: colors.textSecondary }]}>
              {workoutDetails.descricao}
            </Text>
          )}
          <View style={styles.workoutMeta}>
            {workoutDetails.nivel && (
              <View style={[styles.metaItem, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.metaText, { color: colors.primary }]}>
                  {workoutDetails.nivel}
                </Text>
        </View>
            )}
            {workoutDetails.objetivo && (
              <View style={[styles.metaItem, { backgroundColor: colors.secondary + '20' }]}>
                <Text style={[styles.metaText, { color: colors.secondary }]}>
                  {workoutDetails.objetivo}
          </Text>
        </View>
      )}
            {workoutDetails.grupo_muscular_principal && (
              <View style={[styles.metaItem, { backgroundColor: colors.success + '20' }]}>
                <Text style={[styles.metaText, { color: colors.success }]}>
                  {workoutDetails.grupo_muscular_principal}
              </Text>
            </View>
            )}
          </View>
        </View>
      )}

      {!isWorkoutActive && (
        <View style={styles.controlsContainer}>
          <View style={styles.autoStartContainer}>
            <Text style={[styles.autoStartLabel, { color: colors.text }]}>
              Iniciar automaticamente
              </Text>
            <Switch
              value={autoStart}
              onValueChange={setAutoStart}
              trackColor={{ false: colors.border, true: colors.primary + '50' }}
              thumbColor={autoStart ? colors.primary : colors.textSecondary}
            />
            </View>
              <TouchableOpacity
            onPress={handleStartWorkout}
            style={[styles.startButton, { backgroundColor: colors.primary }]}
          >
            <PlayCircle size={24} color="white" />
            <Text style={styles.startButtonText}>Iniciar Treino</Text>
              </TouchableOpacity>
        </View>
      )}

      {renderWorkoutMode()}

      <FlatList
        data={exercises}
        renderItem={renderExercise}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.exercisesList}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={showVideoModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.videoModal}>
          <View style={styles.videoHeader}>
            <TouchableOpacity
              onPress={() => setShowVideoModal(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          {selectedVideoUrl && (
            <WebView
              source={{ uri: selectedVideoUrl }}
              style={styles.videoPlayer}
              allowsFullscreenVideo
            />
          )}
        </View>
      </Modal>

      <Modal
        visible={showNotesModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.notesModal, { backgroundColor: colors.background }]}>
          <View style={styles.notesHeader}>
            <TouchableOpacity
              onPress={() => setShowNotesModal(false)}
              style={styles.cancelButton}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                Cancelar
              </Text>
            </TouchableOpacity>
            <Text style={[styles.notesTitle, { color: colors.text }]}>
              Observações
            </Text>
            <TouchableOpacity
              onPress={handleSaveNotes}
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.saveButtonText}>Salvar</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Adicione suas observações sobre este exercício..."
            placeholderTextColor={colors.textSecondary}
            style={[
              styles.notesInput,
              {
                backgroundColor: colors.cardBackground,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
          />
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  workoutInfo: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  workoutName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  workoutDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  workoutMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  controlsContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  autoStartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  autoStartLabel: {
    fontSize: 16,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  workoutMode: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  workoutTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  endButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  endButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    textAlign: 'center',
  },
  currentExercise: {
    marginBottom: 16,
  },
  currentExerciseName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  currentExerciseDetails: {
    fontSize: 14,
  },
  workoutNavigation: {
    flexDirection: 'row',
    gap: 12,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  navButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  exercisesList: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  exerciseCard: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  exerciseInfo: {
    flex: 1,
    marginRight: 12,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  exerciseDescription: {
    fontSize: 14,
  },
  exerciseActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  workoutControls: {
    marginTop: 12,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  completeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  notesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
  },
  videoModal: {
    flex: 1,
    backgroundColor: 'black',
  },
  videoHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
  },
  closeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
  },
  videoPlayer: {
    flex: 1,
  },
  notesModal: {
    flex: 1,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelButtonText: {
    fontSize: 16,
  },
  notesTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  notesInput: {
    flex: 1,
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  TextInput,
  Alert,
  Animated,
  Pressable,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Image } from 'expo-image';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import {
  ChevronLeft,
  Clock,
  Dumbbell,
  Play,
  RotateCcw,
  Timer,
  Plus,
  Edit,
  Trash,
  Save,
} from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

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
}

interface Exercise {
  id: string;
  ficha_id: string;
  exercicio_id: string;
  series: number;
  repeticoes: string;
  tempo_descanso: string;
  cadencia: string;
  ordem: number;
  exercicios_biblioteca?: {
    id: string;
    nome: string;
  };
}

// Componente de botão animado para melhor feedback visual
const AnimatedButton = ({ onPress, style, children, ...props }) => {
  const animatedValue = React.useRef(new Animated.Value(1)).current;
  const opacityValue = React.useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(animatedValue, {
        toValue: 0.92,
        useNativeDriver: true,
      }),
      Animated.timing(opacityValue, {
        toValue: 0.3,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(animatedValue, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacityValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animatedStyle = {
    transform: [{ scale: animatedValue }],
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...props}
    >
      <Animated.View style={[style, animatedStyle]}>
        {children}
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'white',
            opacity: opacityValue,
            borderRadius: style.borderRadius || 20,
          }}
        />
      </Animated.View>
    </Pressable>
  );
};

export default function WorkoutDetailsScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams();
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [workout, setWorkout] = useState<WorkoutPlan | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [availableExercises, setAvailableExercises] = useState<
    { id: string; nome: string }[]
  >([]);
  const [selectedExercise, setSelectedExercise] = useState('');
  const [series, setSeries] = useState('');
  const [repeticoes, setRepeticoes] = useState('');
  const [tempoDescanso, setTempoDescanso] = useState('');
  const [cadencia, setCadencia] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Estados para edição do treino
  const [showEditWorkoutModal, setShowEditWorkoutModal] = useState(false);
  const [editWorkoutData, setEditWorkoutData] = useState({
    nome: '',
    descricao: '',
    nivel: '',
    objetivo: '',
    duracao_treino: '',
  });

  // Estados para edição de exercício
  const [showEditExerciseModal, setShowEditExerciseModal] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [editExerciseData, setEditExerciseData] = useState({
    series: '',
    repeticoes: '',
    tempo_descanso: '',
    cadencia: '',
  });

  useEffect(() => {
    if (id) {
      fetchWorkoutDetails();
      fetchWorkoutExercises();
      fetchAvailableExercises();
    }
  }, [id]);

  // Função para iniciar a edição do treino
  const handleEditWorkout = () => {
    if (workout) {
      setEditWorkoutData({
        nome: workout.nome || '',
        descricao: workout.descricao || '',
        nivel: workout.nivel || '',
        objetivo: workout.objetivo || '',
        duracao_treino: workout.duracao_treino || '',
      });
      setShowEditWorkoutModal(true);
    }
  };

  // Função para salvar as alterações do treino
  const handleSaveWorkout = async () => {
    try {
      const { error } = await supabase
        .from('treinos')
        .update({
          nome: editWorkoutData.nome,
          descricao: editWorkoutData.descricao,
          nivel: editWorkoutData.nivel,
          objetivo: editWorkoutData.objetivo,
          duracao_treino: editWorkoutData.duracao_treino,
        })
        .eq('id_fichas_treino', id);

      if (error) throw error;

      // Atualizar o estado local
      setWorkout({
        ...workout!,
        nome: editWorkoutData.nome,
        descricao: editWorkoutData.descricao,
        nivel: editWorkoutData.nivel as any,
        objetivo: editWorkoutData.objetivo as any,
        duracao_treino: editWorkoutData.duracao_treino,
      });

      setShowEditWorkoutModal(false);
      Alert.alert('Sucesso', 'Treino atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar treino:', error);
      Alert.alert(
        'Erro',
        'Não foi possível atualizar o treino. Tente novamente.'
      );
    }
  };

  // Função para iniciar a edição de um exercício
  const handleEditExercise = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setEditExerciseData({
      series: exercise.series.toString(),
      repeticoes: exercise.repeticoes,
      tempo_descanso: exercise.tempo_descanso,
      cadencia: exercise.cadencia,
    });
    setShowEditExerciseModal(true);
  };

  // Função para salvar as alterações do exercício
  const handleSaveExercise = async () => {
    if (!editingExercise) return;

    try {
      const { error } = await supabase
        .from('treino_exercicios')
        .update({
          series: parseInt(editExerciseData.series),
          repeticoes: editExerciseData.repeticoes,
          tempo_descanso: editExerciseData.tempo_descanso,
          cadencia: editExerciseData.cadencia,
        })
        .eq('id', editingExercise.id);

      if (error) throw error;

      // Atualizar o estado local
      const updatedExercises = exercises.map((ex) => {
        if (ex.id === editingExercise.id) {
          return {
            ...ex,
            series: parseInt(editExerciseData.series),
            repeticoes: editExerciseData.repeticoes,
            tempo_descanso: editExerciseData.tempo_descanso,
            cadencia: editExerciseData.cadencia,
          };
        }
        return ex;
      });

      setExercises(updatedExercises);
      setShowEditExerciseModal(false);
      Alert.alert('Sucesso', 'Exercício atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar exercício:', error);
      Alert.alert(
        'Erro',
        'Não foi possível atualizar o exercício. Tente novamente.'
      );
    }
  };

  // Função para excluir um exercício
  const handleDeleteExercise = (exerciseId: string) => {
    Alert.alert(
      'Confirmar exclusão',
      'Tem certeza que deseja excluir este exercício?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('treino_exercicios')
                .delete()
                .eq('id', exerciseId);

              if (error) throw error;

              // Atualizar o estado local
              const updatedExercises = exercises.filter(
                (ex) => ex.id !== exerciseId
              );
              setExercises(updatedExercises);

              // Reordenar os exercícios restantes
              await reorderExercises(updatedExercises);

              Alert.alert('Sucesso', 'Exercício excluído com sucesso!');
            } catch (error) {
              console.error('Erro ao excluir exercício:', error);
              Alert.alert(
                'Erro',
                'Não foi possível excluir o exercício. Tente novamente.'
              );
            }
          },
        },
      ]
    );
  };

  // Função para reordenar os exercícios após exclusão
  const reorderExercises = async (exercisesList: Exercise[]) => {
    try {
      // Atualizar a ordem de cada exercício
      for (let i = 0; i < exercisesList.length; i++) {
        const { error } = await supabase
          .from('treino_exercicios')
          .update({ ordem: i + 1 })
          .eq('id', exercisesList[i].id);

        if (error) throw error;
      }

      // Buscar os exercícios atualizados
      await fetchWorkoutExercises();
    } catch (error) {
      console.error('Erro ao reordenar exercícios:', error);
    }
  };

  const fetchAvailableExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('exercicios_biblioteca')
        .select('id, nome')
        .order('nome');

      if (error) throw error;
      setAvailableExercises(data || []);
    } catch (error) {
      console.error('Erro ao buscar exercícios disponíveis:', error);
    }
  };

  const handleAddExercise = async () => {
    if (
      !selectedExercise ||
      !series ||
      !repeticoes ||
      !tempoDescanso ||
      !cadencia
    ) {
      alert('Por favor, preencha todos os campos');
      return;
    }

    try {
      const novaOrdem = exercises.length + 1;
      const { data, error } = await supabase
        .from('treino_exercicios')
        .insert([
          {
            ficha_id: id,
            exercicio_id: selectedExercise,
            series: parseInt(series),
            repeticoes,
            tempo_descanso: tempoDescanso,
            cadencia,
            ordem: novaOrdem,
          },
        ])
        .select();

      if (error) throw error;

      await fetchWorkoutExercises();
      setShowAddExerciseModal(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao adicionar exercício:', error);
      alert('Erro ao adicionar exercício. Tente novamente.');
    }
  };

  const resetForm = () => {
    setSelectedExercise('');
    setSeries('');
    setRepeticoes('');
    setTempoDescanso('');
    setCadencia('');
    setSearchQuery('');
  };

  const fetchWorkoutDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('treinos')
        .select('*')
        .eq('id_fichas_treino', id)
        .single();

      if (error) throw error;
      setWorkout(data);
    } catch (error) {
      console.error('Erro ao buscar detalhes do treino:', error);
    }
  };

  const fetchWorkoutExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('treino_exercicios')
        .select(
          `
          id,
          ficha_id,
          exercicio_id,
          series,
          repeticoes,
          tempo_descanso,
          cadencia,
          ordem,
          exercicios_biblioteca!exercicio_id(id, nome)
        `
        )
        .eq('ficha_id', id)
        .order('ordem', { ascending: true });

      if (error) throw error;
      // Garantir que exercicios_biblioteca seja um objeto, não array
      const exercises = (data || []).map((ex: any) => ({
        ...ex,
        exercicios_biblioteca: Array.isArray(ex.exercicios_biblioteca)
          ? ex.exercicios_biblioteca[0]
          : ex.exercicios_biblioteca,
      }));
      setExercises(exercises);
    } catch (error) {
      console.error('Erro ao buscar exercícios:', error);
    }
  };

  const handleOpenVideo = (videoUrl) => {
    setSelectedVideo(videoUrl);
    setModalVisible(true);
  };

  if (!workout) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Carregando...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.addExerciseModal, { backgroundColor: colors.card }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Adicionar Exercício
              </Text>
              <AnimatedButton
                style={[
                  styles.closeButton,
                  { backgroundColor: colors.background },
                ]}
                onPress={() => {
                  setShowAddExerciseModal(false);
                  resetForm();
                }}
              >
                <X size={24} color={colors.text} />
              </AnimatedButton>
            </View>

            <ScrollView style={styles.modalBody}>
              <TextInput
                style={[
                  styles.searchInput,
                  { backgroundColor: colors.background, color: colors.text },
                ]}
                placeholder="Buscar exercício..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />

              <View style={styles.exerciseList}>
                {availableExercises
                  .filter((ex) =>
                    ex.nome.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((exercise) => (
                    <TouchableOpacity
                      key={exercise.id}
                      style={[
                        styles.exerciseOption,
                        {
                          backgroundColor:
                            selectedExercise === exercise.id
                              ? colors.primary
                              : colors.background,
                        },
                      ]}
                      onPress={() => setSelectedExercise(exercise.id)}
                    >
                      <Text
                        style={[
                          styles.exerciseOptionText,
                          {
                            color:
                              selectedExercise === exercise.id
                                ? 'white'
                                : colors.text,
                          },
                        ]}
                      >
                        {exercise.nome}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>
                  Séries
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.background, color: colors.text },
                  ]}
                  placeholder="Número de séries"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  value={series}
                  onChangeText={setSeries}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>
                  Repetições
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.background, color: colors.text },
                  ]}
                  placeholder="Ex: 12 reps ou 45 segundos"
                  placeholderTextColor={colors.textSecondary}
                  value={repeticoes}
                  onChangeText={setRepeticoes}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>
                  Tempo de Descanso
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.background, color: colors.text },
                  ]}
                  placeholder="Ex: 60 segundos"
                  placeholderTextColor={colors.textSecondary}
                  value={tempoDescanso}
                  onChangeText={setTempoDescanso}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>
                  Cadência
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.background, color: colors.text },
                  ]}
                  placeholder="Ex: 2-0-2"
                  placeholderTextColor={colors.textSecondary}
                  value={cadencia}
                  onChangeText={setCadencia}
                />
              </View>
            </ScrollView>

            <AnimatedButton
              style={[
                styles.addButton,
                { backgroundColor: colors.primary, width: '100%' },
              ]}
              onPress={handleAddExercise}
            >
              <Text style={styles.addButtonText}>Adicionar Exercício</Text>
            </AnimatedButton>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={showAddExerciseModal}
        onRequestClose={() => setShowAddExerciseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.addExerciseModal, { backgroundColor: colors.card }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Adicionar Exercício
              </Text>
              <AnimatedButton
                style={[
                  styles.closeButton,
                  { backgroundColor: colors.background },
                ]}
                onPress={() => {
                  setShowAddExerciseModal(false);
                  resetForm();
                }}
              >
                <X size={24} color={colors.text} />
              </AnimatedButton>
            </View>

            <ScrollView style={styles.modalBody}>
              <TextInput
                style={[
                  styles.searchInput,
                  { backgroundColor: colors.background, color: colors.text },
                ]}
                placeholder="Buscar exercício..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />

              <View style={styles.exerciseList}>
                {availableExercises
                  .filter((ex) =>
                    ex.nome.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((exercise) => (
                    <TouchableOpacity
                      key={exercise.id}
                      style={[
                        styles.exerciseOption,
                        {
                          backgroundColor:
                            selectedExercise === exercise.id
                              ? colors.primary
                              : colors.background,
                        },
                      ]}
                      onPress={() => setSelectedExercise(exercise.id)}
                    >
                      <Text
                        style={[
                          styles.exerciseOptionText,
                          {
                            color:
                              selectedExercise === exercise.id
                                ? 'white'
                                : colors.text,
                          },
                        ]}
                      >
                        {exercise.nome}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>
                  Séries
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.background, color: colors.text },
                  ]}
                  placeholder="Número de séries"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  value={series}
                  onChangeText={setSeries}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>
                  Repetições
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.background, color: colors.text },
                  ]}
                  placeholder="Ex: 12 reps ou 45 segundos"
                  placeholderTextColor={colors.textSecondary}
                  value={repeticoes}
                  onChangeText={setRepeticoes}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>
                  Tempo de Descanso
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.background, color: colors.text },
                  ]}
                  placeholder="Ex: 60 segundos"
                  placeholderTextColor={colors.textSecondary}
                  value={tempoDescanso}
                  onChangeText={setTempoDescanso}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>
                  Cadência
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.background, color: colors.text },
                  ]}
                  placeholder="Ex: 2-0-2"
                  placeholderTextColor={colors.textSecondary}
                  value={cadencia}
                  onChangeText={setCadencia}
                />
              </View>
            </ScrollView>

            <AnimatedButton
              style={[
                styles.addButton,
                { backgroundColor: colors.primary, width: '100%' },
              ]}
              onPress={handleAddExercise}
            >
              <Text style={styles.addButtonText}>Adicionar Exercício</Text>
            </AnimatedButton>
          </View>
        </View>
      </Modal>

      {/* Modal de Edição do Treino */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showEditWorkoutModal}
        onRequestClose={() => setShowEditWorkoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.addExerciseModal, { backgroundColor: colors.card }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Editar Treino
              </Text>
              <TouchableOpacity
                style={[
                  styles.closeButton,
                  { backgroundColor: colors.background },
                ]}
                onPress={() => setShowEditWorkoutModal(false)}
              >
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>
                  Nome do Treino
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.background, color: colors.text },
                  ]}
                  placeholder="Nome do treino"
                  placeholderTextColor={colors.textSecondary}
                  value={editWorkoutData.nome}
                  onChangeText={(text) =>
                    setEditWorkoutData({ ...editWorkoutData, nome: text })
                  }
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>
                  Descrição
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      color: colors.text,
                      height: 80,
                    },
                  ]}
                  placeholder="Descrição do treino"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  value={editWorkoutData.descricao || ''}
                  onChangeText={(text) =>
                    setEditWorkoutData({ ...editWorkoutData, descricao: text })
                  }
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>
                  Nível
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert(
                      'Selecione o Nível',
                      '',
                      [
                        {
                          text: 'Iniciante',
                          onPress: () =>
                            setEditWorkoutData({
                              ...editWorkoutData,
                              nivel: 'iniciante',
                            }),
                        },
                        {
                          text: 'Intermediário',
                          onPress: () =>
                            setEditWorkoutData({
                              ...editWorkoutData,
                              nivel: 'intermediário',
                            }),
                        },
                        {
                          text: 'Avançado',
                          onPress: () =>
                            setEditWorkoutData({
                              ...editWorkoutData,
                              nivel: 'avançado',
                            }),
                        },
                        {
                          text: 'Cancelar',
                          style: 'cancel',
                        },
                      ],
                      { cancelable: true }
                    );
                  }}
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      justifyContent: 'center',
                    },
                  ]}
                >
                  <Text style={{ color: colors.text, textAlign: 'left' }}>
                    {editWorkoutData.nivel || 'Selecione o nível'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>
                  Objetivo
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.background, color: colors.text },
                  ]}
                  placeholder="Hipertrofia, Força, Emagrecimento, etc."
                  placeholderTextColor={colors.textSecondary}
                  value={editWorkoutData.objetivo}
                  onChangeText={(text) =>
                    setEditWorkoutData({ ...editWorkoutData, objetivo: text })
                  }
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>
                  Duração do Treino
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.background, color: colors.text },
                  ]}
                  placeholder="Ex: 45 minutos"
                  placeholderTextColor={colors.textSecondary}
                  value={editWorkoutData.duracao_treino || ''}
                  onChangeText={(text) =>
                    setEditWorkoutData({
                      ...editWorkoutData,
                      duracao_treino: text,
                    })
                  }
                />
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.addButton,
                { backgroundColor: colors.primary, width: '100%' },
              ]}
              onPress={handleSaveWorkout}
            >
              <Text style={styles.addButtonText}>Salvar Alterações</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Edição de Exercício */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showEditExerciseModal}
        onRequestClose={() => setShowEditExerciseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.addExerciseModal, { backgroundColor: colors.card }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Editar Exercício
              </Text>
              <TouchableOpacity
                style={[
                  styles.closeButton,
                  { backgroundColor: colors.background },
                ]}
                onPress={() => setShowEditExerciseModal(false)}
              >
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text
                style={[
                  styles.exerciseName,
                  { color: colors.text, marginBottom: 20 },
                ]}
              >
                {editingExercise?.exercicios_biblioteca?.nome}
              </Text>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>
                  Séries
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.background, color: colors.text },
                  ]}
                  placeholder="Número de séries"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  value={editExerciseData.series}
                  onChangeText={(text) =>
                    setEditExerciseData({ ...editExerciseData, series: text })
                  }
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>
                  Repetições
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.background, color: colors.text },
                  ]}
                  placeholder="Ex: 12 reps ou 45 segundos"
                  placeholderTextColor={colors.textSecondary}
                  value={editExerciseData.repeticoes}
                  onChangeText={(text) =>
                    setEditExerciseData({
                      ...editExerciseData,
                      repeticoes: text,
                    })
                  }
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>
                  Tempo de Descanso
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.background, color: colors.text },
                  ]}
                  placeholder="Ex: 60 segundos"
                  placeholderTextColor={colors.textSecondary}
                  value={editExerciseData.tempo_descanso}
                  onChangeText={(text) =>
                    setEditExerciseData({
                      ...editExerciseData,
                      tempo_descanso: text,
                    })
                  }
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>
                  Cadência
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.background, color: colors.text },
                  ]}
                  placeholder="Ex: 2-0-2"
                  placeholderTextColor={colors.textSecondary}
                  value={editExerciseData.cadencia}
                  onChangeText={(text) =>
                    setEditExerciseData({ ...editExerciseData, cadencia: text })
                  }
                />
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.addButton,
                { backgroundColor: colors.primary, width: '100%' },
              ]}
              onPress={handleSaveExercise}
            >
              <Text style={styles.addButtonText}>Salvar Alterações</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text style={[styles.title, { color: colors.text }]}>
                {workout.nome}
              </Text>
              <AnimatedButton
                style={[styles.editButton, styles.editWorkoutButton]}
                onPress={handleEditWorkout}
              >
                <Edit size={18} color="#ffffff" strokeWidth={2.5} />
              </AnimatedButton>
            </View>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {workout.descricao}
            </Text>

            <View style={styles.metaInfo}>
              <View style={styles.metaItem}>
                <Clock size={20} color={colors.primary} />
                <Text style={[styles.metaText, { color: colors.text }]}>
                  {workout.duracao_treino}
                </Text>
              </View>
              <View
                style={[
                  styles.levelBadge,
                  { backgroundColor: 'rgba(236, 72, 153, 0.1)' },
                ]}
              >
                <Text style={[styles.levelText, { color: colors.primary }]}>
                  {workout.nivel}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Exercícios
            </Text>
            <AnimatedButton
              style={[styles.addButton, styles.addExerciseButton]}
              onPress={() => setShowAddExerciseModal(true)}
            >
              <Plus size={22} color="#ffffff" strokeWidth={2.5} />
            </AnimatedButton>
          </View>

          {exercises.length === 0 ? (
            <View
              style={[
                styles.emptyStateContainer,
                { backgroundColor: colors.card },
              ]}
            >
              <Text style={[styles.emptyStateText, { color: colors.text }]}>
                Nenhum exercício cadastrado neste treino.
              </Text>
              <Text
                style={[
                  styles.emptyStateSubText,
                  { color: colors.textSecondary },
                ]}
              >
                Clique no botão + acima para adicionar exercícios.
              </Text>
            </View>
          ) : (
            exercises.map((exercise, index) => (
              <View
                key={exercise.id}
                style={[styles.exerciseCard, { backgroundColor: colors.card }]}
              >
                <View style={styles.exerciseHeader}>
                  <Text style={[styles.exerciseName, { color: colors.text }]}>
                    {exercise.exercicios_biblioteca?.nome}
                  </Text>
                  <View style={styles.exerciseActions}>
                    <AnimatedButton
                      onPress={() => handleEditExercise(exercise)}
                      style={[styles.actionButton, styles.pinkActionButton]}
                    >
                      <Edit size={14} color="#fff" strokeWidth={2.5} />
                    </AnimatedButton>
                    <AnimatedButton
                      onPress={() => handleDeleteExercise(exercise.id)}
                      style={[styles.actionButton, styles.pinkActionButton]}
                    >
                      <Trash size={14} color="#fff" strokeWidth={2.5} />
                    </AnimatedButton>
                  </View>
                </View>

                <View style={styles.exerciseDetails}>
                  <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                      <RotateCcw size={16} color={colors.primary} />
                      <Text
                        style={[
                          styles.detailLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Séries
                      </Text>
                      <Text
                        style={[styles.detailValue, { color: colors.text }]}
                      >
                        {exercise.series}
                      </Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Timer size={16} color={colors.primary} />
                      <Text
                        style={[
                          styles.detailLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Reps
                      </Text>
                      <Text
                        style={[styles.detailValue, { color: colors.text }]}
                      >
                        {exercise.repeticoes}
                      </Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Clock size={16} color={colors.primary} />
                      <Text
                        style={[
                          styles.detailLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Descanso
                      </Text>
                      <Text
                        style={[styles.detailValue, { color: colors.text }]}
                      >
                        {exercise.tempo_descanso}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.tempoContainer,
                      { backgroundColor: 'rgba(236, 72, 153, 0.1)' },
                    ]}
                  >
                    <Text
                      style={[styles.tempoLabel, { color: colors.primary }]}
                    >
                      Cadência:
                    </Text>
                    <Text
                      style={[styles.tempoValue, { color: colors.primary }]}
                    >
                      {exercise.cadencia}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  editWorkoutButton: {
    backgroundColor: '#EC4899',
    borderWidth: 1.5,
    borderColor: '#EC4899',
    transform: [{ scale: 1 }],
    overflow: 'hidden',
  },
  exerciseActions: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 'auto',
  },
  actionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  pinkActionButton: {
    backgroundColor: '#EC4899',
    borderWidth: 1.5,
    borderColor: '#EC4899',
    overflow: 'hidden',
  },
  addExerciseModal: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20,
    padding: 20,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
  },
  modalBody: {
    marginBottom: 20,
  },
  searchInput: {
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontFamily: 'Poppins-Regular',
  },
  exerciseList: {
    marginBottom: 20,
  },
  exerciseOption: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  exerciseOptionText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
  },
  formGroup: {
    marginBottom: 15,
  },
  formLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    marginBottom: 5,
  },
  input: {
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontFamily: 'Poppins-Regular',
  },
  addButtonText: {
    color: 'white',
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
  },
  container: {
    flex: 1,
  },
  coverImage: {
    width: '100%',
    height: 300,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 999,
  },
  content: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    backgroundColor: 'inherit',
  },
  header: {
    marginTop: 24,
    marginBottom: 24,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 28,
    marginBottom: 8,
  },
  description: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    marginBottom: 16,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    marginLeft: 8,
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  levelText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 32,
  },
  emptyStateContainer: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  emptyStateText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    textAlign: 'center',
  },
  startButtonText: {
    fontFamily: 'Poppins-Bold',
    color: 'white',
    fontSize: 18,
    marginLeft: 12,
  },
  sectionTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  addExerciseButton: {
    backgroundColor: '#EC4899',
    borderWidth: 1.5,
    borderColor: '#EC4899',
    transform: [{ scale: 1 }],
    overflow: 'hidden',
  },
  exerciseCard: {
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    padding: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  exerciseName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
  },
  exerciseNumberContainer: {
    width: 40,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseNumber: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
  },
  exerciseImage: {
    width: 100,
    height: 100,
  },
  exerciseDetails: {
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    alignItems: 'center',
    gap: 4,
  },
  detailLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
  },
  detailValue: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
  },
  tempoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
  },
  tempoLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    marginRight: 8,
  },
  tempoValue: {
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
  },
  restContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
  },
  restText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    marginLeft: 8,
  },
  notes: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  watchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  watchButtonText: {
    fontFamily: 'Poppins-Medium',
    color: 'white',
    fontSize: 14,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    aspectRatio: 9 / 16,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayer: {
    flex: 1,
  },
  loadingText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 40,
  },
});

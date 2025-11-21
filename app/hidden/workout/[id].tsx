import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Modal, TextInput, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { ChevronLeft, CreditCard as Edit, Copy, Users, Calendar, Dumbbell, Clock, Weight, MessageSquare, Play, Plus } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '@/lib/supabase';

// Definição do tipo para o treino
type WorkoutDetails = {
  id: string;
  title: string;
  createdAt: string;
  type: string;
  status: string;
  description: string | null;
  exercises: [
    {
      id: '1',
      name: 'Burpees',
      sets: 4,
      reps: '15 repetições',
      load: 'Peso corporal',
      notes: 'Manter ritmo constante, descanso de 30s entre séries',
      video: 'https://images.unsplash.com/photo-1599058917765-a780eda07a3e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
    },
    {
      id: '2',
      name: 'Mountain Climbers',
      sets: 3,
      reps: '45 segundos',
      load: 'Peso corporal',
      notes: 'Manter core estável, ritmo moderado a intenso',
      video: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
    },
  ],
  clients: [
    {
      id: '1',
      name: 'Ana Silva',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
      startDate: '15/01/2024',
      progress: 85,
      lastSession: '10/05/2024',
    },
    {
      id: '2',
      name: 'Carla Mendes',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
      startDate: '20/01/2024',
      progress: 65,
      lastSession: '09/05/2024',
    },
  ],
};

// Sample data for exercise list
const EXERCISE_LIST = [
  { id: '1', name: 'Burpees' },
  { id: '2', name: 'Mountain Climbers' },
  { id: '3', name: 'Push-ups' },
  { id: '4', name: 'Squats' },
  { id: '5', name: 'Planks' },
];

export default function WorkoutDetailsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [workout, setWorkout] = useState<WorkoutDetails | null>(null);
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [restTime, setRestTime] = useState('');
  
  useEffect(() => {
    async function fetchWorkoutDetails() {
      if (!id) return;
      
      try {
        // Buscar os detalhes da ficha de treino
        const { data: fichaDetails, error } = await supabase
          .from('fichas_treino')
          .select('*')
          .eq('id_fichas_treino', id)
          .single();
          
        if (error) throw error;
        
        if (fichaDetails) {
          setWorkout({
            id: fichaDetails.id_fichas_treino,
            title: fichaDetails.nome,
            createdAt: fichaDetails.created_at ? new Date(fichaDetails.created_at).toLocaleDateString('pt-BR') : 'N/A',
            type: fichaDetails.modalidade || 'N/A',
            status: fichaDetails.status ? 'active' : 'inactive',
            description: fichaDetails.descricao
          });
        }
      } catch (error) {
        console.error('Erro ao buscar detalhes do treino:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchWorkoutDetails();
  }, [id]);

  const handleAddExercise = () => {
    if (!selectedExercise || !sets || !reps || !restTime) return;

    const newExercise = {
      id: String(Math.random()),
      name: EXERCISE_LIST.find(ex => ex.id === selectedExercise)?.name || '',
      sets: parseInt(sets),
      reps: reps,
      load: 'Peso corporal',
      notes: `Descanso: ${restTime} segundos entre séries`,
      video: 'https://images.unsplash.com/photo-1599058917765-a780eda07a3e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
    };
    setShowAddExerciseModal(false);
    setSelectedExercise('');
    setSets('');
    setReps('');
    setRestTime('');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity 
        style={[styles.backButton, { backgroundColor: colors.card }]}
        onPress={() => router.back()}
      >
        <ChevronLeft size={20} color={colors.text} />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando detalhes do treino...</Text>
          </View>
        ) : workout ? (
          <>
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>{workout.title}</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Criado em {workout.createdAt}
              </Text>
            </View>

          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: colors.card }]}
              onPress={() => {}}
            >
              <Edit size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: colors.card }]}
              onPress={() => {}}
            >
              <Copy size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.metaInfo}>
          <View style={[styles.metaTag, { backgroundColor: 'rgba(236, 72, 153, 0.1)' }]}>
            <Text style={[styles.metaTagText, { color: colors.primary }]}>{workout.type}</Text>
          </View>
          <View style={[
            styles.statusTag, 
            { 
              backgroundColor: workout.status === 'active' 
                ? 'rgba(16, 185, 129, 0.1)' 
                : 'rgba(239, 68, 68, 0.1)' 
            }
          ]}>
            <Text style={[
              styles.statusText,
              { 
                color: workout.status === 'active' 
                  ? '#10B981' 
                  : '#EF4444' 
              }
            ]}>
              {workout.status === 'active' ? 'Ativo' : 'Inativo'}
            </Text>
          </View>
        </View>

        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {workout.description}
        </Text>
        </>)
        : (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Treino não encontrado</Text>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Exercícios</Text>
            <TouchableOpacity 
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowAddExerciseModal(true)}
            >
              <Plus size={16} color="white" />
              <Text style={styles.addButtonText}>Adicionar</Text>
            </TouchableOpacity>
          </View>

          <Modal
            visible={showAddExerciseModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowAddExerciseModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Adicionar Exercício</Text>

                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Exercício</Text>
                  <View style={[styles.picker, { backgroundColor: colors.background }]}>
                    <Picker
                      selectedValue={selectedExercise}
                      onValueChange={(value) => setSelectedExercise(value)}
                      style={{ color: colors.text }}
                    >
                      <Picker.Item label="Selecione um exercício" value="" />
                      {EXERCISE_LIST.map((exercise) => (
                        <Picker.Item 
                          key={exercise.id} 
                          label={exercise.name} 
                          value={exercise.id} 
                        />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Séries</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                    value={sets}
                    onChangeText={setSets}
                    placeholder="Número de séries"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Repetições</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                    value={reps}
                    onChangeText={setReps}
                    placeholder="Ex: 15 repetições ou 45 segundos"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Tempo de Descanso (segundos)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                    value={restTime}
                    onChangeText={setRestTime}
                    placeholder="Ex: 30"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    style={[styles.modalButton, { backgroundColor: colors.card }]}
                    onPress={() => setShowAddExerciseModal(false)}
                  >
                    <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.modalButton, { backgroundColor: colors.primary }]}
                    onPress={handleAddExercise}
                  >
                    <Text style={[styles.modalButtonText, { color: 'white' }]}>Adicionar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {WORKOUT.exercises.map((exercise, index) => (
            <View 
              key={exercise.id}
              style={[styles.exerciseCard, { backgroundColor: colors.card }]}
            >
              <View style={styles.exerciseContent}>
                <Text style={[styles.exerciseName, { color: colors.text }]}>{exercise.name}</Text>
                
                <View style={styles.exerciseMeta}>
                  <View style={styles.metaItem}>
                    <Clock size={16} color={colors.primary} />
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                      {exercise.sets} séries
                    </Text>
                  </View>
                  
                  <View style={styles.metaItem}>
                    <Dumbbell size={16} color={colors.primary} />
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                      {exercise.reps}
                    </Text>
                  </View>
                  
                  <View style={styles.metaItem}>
                    <Weight size={16} color={colors.primary} />
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                      {exercise.load}
                    </Text>
                  </View>
                </View>

                <View style={styles.notesContainer}>
                  <MessageSquare size={16} color={colors.primary} />
                  <Text style={[styles.notesText, { color: colors.textSecondary }]}>
                    {exercise.notes}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Alunas</Text>
            <TouchableOpacity 
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={() => {}}
            >
              <Users size={16} color="white" />
              <Text style={styles.addButtonText}>Adicionar</Text>
            </TouchableOpacity>
          </View>

          {WORKOUT.clients.map((client) => (
            <TouchableOpacity 
              key={client.id}
              style={[styles.clientCard, { backgroundColor: colors.card }]}
              onPress={() => router.push(`/client-details/${client.id}`)}
            >
              <Image
                source={client.image}
                style={styles.clientImage}
              />
              <View style={styles.clientInfo}>
                <Text style={[styles.clientName, { color: colors.text }]}>{client.name}</Text>
                <View style={styles.clientMeta}>
                  <View style={styles.metaItem}>
                    <Calendar size={14} color={colors.primary} />
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                      Início: {client.startDate}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Clock size={14} color={colors.primary} />
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                      Último treino: {client.lastSession}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.progressCircle}>
                <Text style={styles.progressText}>{client.progress}%</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 12,
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    textAlign: 'center',
  },
  container: {
    flex: 1,
    paddingTop: 60,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
  },
  headerActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  metaInfo: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 16,
  },
  metaTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
  },
  metaTagText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
  },
  statusTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
  },
  description: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addButtonText: {
    fontFamily: 'Poppins-Medium',
    color: 'white',
    fontSize: 14,
    marginLeft: 4,
  },
  exerciseCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  exerciseImage: {
    width: '100%',
    height: 200,
  },
  exerciseContent: {
    padding: 16,
  },
  exerciseName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    marginBottom: 12,
  },
  exerciseMeta: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    marginLeft: 4,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  notesText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  watchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  watchButtonText: {
    fontFamily: 'Poppins-Medium',
    color: 'white',
    fontSize: 14,
    marginLeft: 8,
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
  },
  clientImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  clientInfo: {
    flex: 1,
    marginLeft: 12,
  },
  clientName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    marginBottom: 4,
  },
  clientMeta: {
    flexDirection: 'column',
  },
  progressCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EC4899',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  progressText: {
    fontFamily: 'Poppins-Bold',
    color: 'white',
    fontSize: 12,
  },
  bottomPadding: {
    height: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    marginBottom: 8,
  },
  picker: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
    gap: 12,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  modalButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
  },
});
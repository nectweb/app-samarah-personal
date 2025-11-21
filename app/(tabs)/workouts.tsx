import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/context/ThemeContext';
import { router } from 'expo-router';
import { Plus, Filter, ChevronRight, Clock, Users, Search, X, Trash2 } from 'lucide-react-native';
import { Dumbbell } from 'lucide-react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { supabase } from '@/lib/supabase';
import { useFocusEffect } from 'expo-router';

// Interfaces para as novas tabelas
interface Ficha {
  id: number;
  nome_ficha: string;
  descricao: string | null;
}

interface FichaTreino {
  id: number;
  fichas_id: number;
  treinos_id: string;
}

interface FichaAluna {
  id: string;
  data_inicio: string;
  data_fim: string | null;
  id_fichas: number;
  id_aluna: string;
}

// Interface para os treinos
interface WorkoutPlan {
  id_fichas_treino: string;
  nome: string;
  descricao: string | null;
  nivel: 'iniciante' | 'intermediário' | 'avançado' | null;
  objetivo: 'Hipertrofia' | 'Força' | 'Emagrecimento' | 'Resistência' | 'Condicionamento' | null;
  duracao_semanas: number | null;
  frequencia_semanal: string | null;
  duracao_treino: string | null;
  modalidade: string | null;
  status: boolean | null;
  ordem: number | null;
}



// Sample data for categories
const CATEGORIES = [
  { id: '1', name: 'Todos' },
  { id: '2', name: 'HIIT' },
  { id: '3', name: 'Hipertrofia' },
  { id: '4', name: 'Força' },
  { id: '5', name: 'Funcional' },
];

export default function WorkoutsScreen() {
  const { colors } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState('1');
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      fetchWorkouts();
    }, [])
  );

  const fetchWorkouts = async () => {
    try {
      // Buscar todos os treinos, independentemente de relacionamento
      const { data, error } = await supabase
        .from('treinos')
        .select(`
          *,
          fichas_treino(fichas_id),
          treino_exercicios:treino_exercicios(count)
        `)
        .order('ordem', { ascending: true });

      if (error) throw error;
      
      const workoutsWithExerciseCount = data?.map(workout => ({
        ...workout,
        exercicios_count: workout.treino_exercicios?.[0]?.count || 0,
        fichas_id: workout.fichas_treino?.[0]?.fichas_id || null
      })) || [];

      setWorkoutPlans(workoutsWithExerciseCount);
    } catch (error) {
      console.error('Erro ao buscar treinos:', error);
    }
  };
  const [newWorkout, setNewWorkout] = useState({
    title: '',
    description: '',
    level: 'iniciante',
    type: 'Hipertrofia',
    duration: '',
  });

  const LEVELS = ['iniciante', 'intermediário', 'avançado'];
  const OBJECTIVES = ['Hipertrofia', 'Força', 'Emagrecimento', 'Resistência', 'Condicionamento'];

  const handleAddWorkout = async () => {
    try {
      const { data, error } = await supabase
        .from('treinos')
        .insert([{
          nome: newWorkout.title,
          descricao: newWorkout.description,
          nivel: newWorkout.level,
          objetivo: newWorkout.type,
          duracao_treino: newWorkout.duration,
          status: true
        }])
        .select();
  
        if (error) throw error;
        
        if (data) {
          setWorkoutPlans([...workoutPlans, ...data]);
          setShowAddModal(false);
          setNewWorkout({
            title: '',
            description: '',
            level: 'iniciante',
            type: 'Hipertrofia',
            duration: ''
          });
        }
      } catch (error) {
        console.error('Erro ao adicionar treino:', error);
      }
    };

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryButton,
        selectedCategory === item.id && { backgroundColor: colors.primary },
      ]}
      onPress={() => setSelectedCategory(item.id)}
    >
      <Text
        style={[
          styles.categoryText,
          selectedCategory === item.id ? { color: 'white' } : { color: colors.text },
        ]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState(null);

  const handleDeleteWorkout = async (id) => {
    try {
      // Primeiro, excluir todos os exercícios vinculados ao treino
      const { error: deleteExercisesError } = await supabase
        .from('treino_exercicios')
        .delete()
        .eq('ficha_id', id);

      if (deleteExercisesError) throw deleteExercisesError;

      // Depois, excluir o treino
      const { error: deleteWorkoutError } = await supabase
        .from('treinos')
        .delete()
        .eq('id_fichas_treino', id);

      if (deleteWorkoutError) throw deleteWorkoutError;
      
      setWorkoutPlans(workoutPlans.filter(workout => workout.id_fichas_treino !== id));
      setDeleteModalVisible(false);
      setWorkoutToDelete(null);
    } catch (error) {
      console.error('Erro ao deletar treino:', error);
    }
  };

  const renderWorkoutItem = ({ item }) => (
    <View style={[styles.workoutCard, { backgroundColor: colors.card }]}>
      <TouchableOpacity 
        style={styles.workoutContent}
        onPress={() => router.push(`/workout-details/${item.id_fichas_treino}`)}
      >
        <View style={styles.workoutTitleContainer}>
          <Text style={[styles.workoutTitle, { color: colors.text }]}>{item.nome}</Text>
          <TouchableOpacity 
            style={[styles.deleteButton, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
            onPress={() => {
              setWorkoutToDelete(item.id_fichas_treino);
              setDeleteModalVisible(true);
            }}
          >
            <Trash2 size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
        <Text 
          style={[styles.workoutDescription, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {item.descricao}
        </Text>
        
        <View style={styles.workoutMetaContainer}>
          <View style={styles.workoutMeta}>
            <Clock size={16} color={colors.primary} />
            <Text style={[styles.workoutMetaText, { color: colors.textSecondary }]}>{item.duracao_treino}</Text>
          </View>
          
          <View style={styles.workoutMeta}>
            <Dumbbell size={16} color={colors.primary} />
            <Text style={[styles.workoutMetaText, { color: colors.textSecondary }]}>{item.exercicios_count} exercícios</Text>
          </View>
          
          <View style={styles.workoutMeta}>
            <Users size={16} color={colors.primary} />
            <Text style={[styles.workoutMetaText, { color: colors.textSecondary }]}>{item.modalidade}</Text>
          </View>
        </View>
        
        <View style={styles.workoutFooter}>
          <View style={[styles.levelBadge, { backgroundColor: 'rgba(236, 72, 153, 0.1)' }]}>
            <Text style={[styles.levelText, { color: colors.primary }]}>{item.nivel}</Text>
          </View>
          
          <View style={styles.workoutActions}>
            <View style={styles.detailsButton}>
              <Text style={[styles.detailsText, { color: colors.primary }]}>Ver Detalhes</Text>
              <ChevronRight size={16} color={colors.primary} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Sessões de Treinos</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowAddModal(true)}
          >
            <Plus size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchInputContainer, { backgroundColor: colors.card }]}>
          <Search size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Pesquisar treinos..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <X size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={workoutPlans.filter(workout => {
          const searchLower = searchQuery.toLowerCase();
          return (
            workout.nome.toLowerCase().includes(searchLower) ||
            (workout.descricao && workout.descricao.toLowerCase().includes(searchLower))
          );
        })}
        renderItem={renderWorkoutItem}
        keyExtractor={item => item.id_fichas_treino}
        contentContainerStyle={styles.workoutList}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={showAddModal}
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Adicionar Novo Treino</Text>
            
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
              placeholder="Nome do Treino"
              placeholderTextColor={colors.textSecondary}
              value={newWorkout.title}
              onChangeText={(text) => setNewWorkout(prev => ({ ...prev, title: text }))}
            />
            
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
              placeholder="Descrição"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
              value={newWorkout.description}
              onChangeText={(text) => setNewWorkout(prev => ({ ...prev, description: text }))}
            />
            
            <View style={[styles.pickerContainer, { backgroundColor: colors.background }]}>
              <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>Nível</Text>
              <Dropdown
                style={[styles.dropdown, { backgroundColor: colors.background }]}
                placeholderStyle={[styles.placeholderStyle, { color: colors.textSecondary }]}
                selectedTextStyle={[styles.selectedTextStyle, { color: colors.text }]}
                data={LEVELS.map(level => ({ label: level, value: level }))}
                maxHeight={300}
                labelField="label"
                valueField="value"
                placeholder="Selecione o nível"
                value={newWorkout.level}
                onChange={item => setNewWorkout(prev => ({ ...prev, level: item.value }))}
              />
            </View>

            <View style={[styles.pickerContainer, { backgroundColor: colors.background }]}>
              <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>Objetivo</Text>
              <Dropdown
                style={[styles.dropdown, { backgroundColor: colors.background }]}
                placeholderStyle={[styles.placeholderStyle, { color: colors.textSecondary }]}
                selectedTextStyle={[styles.selectedTextStyle, { color: colors.text }]}
                data={OBJECTIVES.map(objective => ({ label: objective, value: objective }))}
                maxHeight={300}
                labelField="label"
                valueField="value"
                placeholder="Selecione o objetivo"
                value={newWorkout.type}
                onChange={item => setNewWorkout(prev => ({ ...prev, type: item.value }))}
              />
            </View>
            
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
              placeholder="Duração (ex: 45 min)"
              placeholderTextColor={colors.textSecondary}
              value={newWorkout.duration}
              onChangeText={(text) => setNewWorkout(prev => ({ ...prev, duration: text }))}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                onPress={() => {
                  setShowAddModal(false);
                  setNewWorkout({
                    title: '',
                    description: '',
                    level: 'iniciante',
                    type: 'Hipertrofia',
                    duration: ''
                  });
                }}
              >
                <Text style={[styles.modalButtonText, { color: '#EF4444' }]}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleAddWorkout}
              >
                <Text style={[styles.modalButtonText, { color: 'white' }]}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={() => {
          setDeleteModalVisible(false);
          setWorkoutToDelete(null);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Confirmar Exclusão</Text>
            <Text style={[styles.modalText, { color: colors.textSecondary }]}>
              Tem certeza que deseja excluir este treino? Esta ação não pode ser desfeita.
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setWorkoutToDelete(null);
                }}
              >
                <Text style={[styles.modalButtonText, { color: '#EF4444' }]}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={() => handleDeleteWorkout(workoutToDelete)}
              >
                <Text style={[styles.modalButtonText, { color: 'white' }]}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    height: 50,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(236, 72, 153, 0.5)',
  },
  placeholderStyle: { 
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
  },
  selectedTextStyle: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
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
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    marginBottom: 12,
  },
  modalText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
  },
  modalText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 12,
  },
  deleteButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
  },
  workoutActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
  },
  pickerContainer: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  pickerLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    marginBottom: 12,
  },
  picker: {
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 8,
    overflow: 'hidden',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
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
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
  },
  headerButtons: {
    flexDirection: 'row',
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoriesContainer: {
    marginBottom: 20,
  },
  categoriesList: {
    paddingHorizontal: 20,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: 'rgba(236, 72, 153, 0.1)',
  },
  categoryText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
  },
  workoutsList: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  workoutCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    marginLeft: 16,
    marginRight: 16,
  },
  workoutImage: {
    width: '100%',
    height: 160,
  },
  workoutContent: {
    padding: 16,
  },
  workoutTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    marginBottom: 4,
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
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  workoutTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    flex: 1,
  },
  workoutTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailsText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    marginRight: 4,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    paddingVertical: 8,
  },
  clearButton: {
    padding: 4,
    borderRadius: 12,
  },
});
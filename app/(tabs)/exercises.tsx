import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Plus, Search, Filter, Trash2, CreditCard as Edit2, X, CircleAlert as AlertCircle} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

type Exercise = {
  id: string;
  nome: string;
  descricao: string | null;
  url_video: string | null;
  equipamento_necessario: string | null;
  created_at: string | null;
};

type FormData = {
  name: string;
  equipment: string;
  videoUrl: string;
  description: string;
};

// Categories for filtering
const CATEGORIES = [
  { id: '1', name: 'Todos' },
  { id: '2', name: 'Superior' },
  { id: '3', name: 'Inferior' },
  { id: '4', name: 'Core' },
  { id: '5', name: 'Cardio' },
];

export default function ExercisesScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('1');
  const [showAddModal, setShowAddModal] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    equipment: '',
    videoUrl: '',
    description: '',
  });
  const [formErrors, setFormErrors] = useState<Partial<FormData>>({});

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('exercicios_biblioteca')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;

      setExercises(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar exercícios');
    } finally {
      setLoading(false);
    }
  };

  const handleEditExercise = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setFormData({
      name: exercise.nome,
      equipment: exercise.equipamento_necessario || '',
      videoUrl: exercise.url_video || '',
      description: exercise.descricao || '',
    });
    setShowAddModal(true);
  };

  const validateForm = () => {
    const errors: Partial<FormData> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Nome do exercício é obrigatório';
    }
    
    if (!formData.description.trim()) {
      errors.description = 'Descrição é obrigatória';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (validateForm()) {
      try {
        if (editingExercise) {
          const { error } = await supabase
            .from('exercicios_biblioteca')
            .update({
              nome: formData.name,
              descricao: formData.description,
              url_video: formData.videoUrl,
              equipamento_necessario: formData.equipment,
            })
            .eq('id', editingExercise.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('exercicios_biblioteca')
            .insert([
              {
                nome: formData.name,
                descricao: formData.description,
                url_video: formData.videoUrl,
                equipamento_necessario: formData.equipment,
              },
            ]);

          if (error) throw error;
        }

        await fetchExercises();
        setFormData({
          name: '',
          equipment: '',
          videoUrl: '',
          description: '',
        });
        setEditingExercise(null);
        setShowAddModal(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao salvar exercício');
      }
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<Exercise | null>(null);

  const handleDeleteExercise = async (id: string) => {
    try {
      setLoading(true);

      // 1. Buscar todos os ids de treino_exercicios relacionados ao exercício
      const { data: treinoExercicios, error: errorBusca } = await supabase
        .from('treino_exercicios')
        .select('id')
        .eq('exercicio_id', id);
      if (errorBusca) throw errorBusca;

      // 2. Excluir todos os registros em controle_peso que referenciam esses ids
      if (treinoExercicios && treinoExercicios.length > 0) {
        const treinoIds = treinoExercicios.map(f => f.id);
        const { error: errorControlePeso } = await supabase
          .from('controle_peso')
          .delete()
          .in('exercicio_treino_id', treinoIds);
        if (errorControlePeso) throw errorControlePeso;
      }

      // 3. Excluir os registros em treino_exercicios
      const { error: errorVinculos } = await supabase
        .from('treino_exercicios')
        .delete()
        .eq('exercicio_id', id);
      if (errorVinculos) throw errorVinculos;

      // 4. Excluir o exercício da biblioteca
      const { error } = await supabase
        .from('exercicios_biblioteca')
        .delete()
        .eq('id', id);
      if (error) throw error;

      await fetchExercises();
      setShowDeleteModal(false);
      setExerciseToDelete(null);
    } catch (err) {
      console.error('Erro completo:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível excluir o exercício. Tente novamente mais tarde.'
      );
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
    }
  };

  const confirmDelete = (exercise: Exercise) => {
    setExerciseToDelete(exercise);
    setShowDeleteModal(true);
  };

  const renderExerciseCard = (exercise: Exercise) => (
    <View key={exercise.id} style={[styles.exerciseCard, { backgroundColor: colors.card }]}>
      <View style={styles.exerciseContent}>
        <View style={styles.exerciseHeader}>
          <Text style={[styles.exerciseName, { color: colors.text }]}>{exercise.nome}</Text>
          <View style={styles.exerciseActions}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: 'rgba(236, 72, 153, 0.1)' }]}
              onPress={() => handleEditExercise(exercise)}
            >
              <Edit2 size={16} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
              onPress={() => confirmDelete(exercise)}
            >
              <Trash2 size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.exerciseDescription, { color: colors.textSecondary }]}>
          {exercise.descricao}
        </Text>

        {exercise.equipamento_necessario && (
          <View style={styles.exerciseMeta}>
            <View style={[styles.equipmentTag, { backgroundColor: 'rgba(236, 72, 153, 0.1)' }]}>
              <Text style={[styles.equipmentText, { color: colors.primary }]}>{exercise.equipamento_necessario}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  const filteredExercises = exercises.filter(exercise => 
    exercise.nome.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Modal
        visible={showDeleteModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <TouchableOpacity
          style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
          activeOpacity={1}
          onPress={() => setShowDeleteModal(false)}
        >
          <View style={[styles.deleteModalContent, { backgroundColor: colors.background }]}>
            <View style={styles.deleteIconContainer}>
              <View style={[styles.deleteIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                <AlertCircle size={32} color="#EF4444" />
              </View>
            </View>
            <Text style={[styles.deleteTitle, { color: colors.text }]}>Confirmar Exclusão</Text>
            <Text style={[styles.deleteMessage, { color: colors.textSecondary }]}>
              Tem certeza que deseja excluir este exercício? Esta ação não pode ser desfeita.
            </Text>
            <View style={styles.deleteActions}>
              <TouchableOpacity
                style={[styles.deleteButton, styles.cancelButton, { backgroundColor: colors.card }]}
                onPress={() => setShowDeleteModal(false)}
                disabled={loading}
              >
                <Text style={[styles.deleteButtonText, { color: colors.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteButton, styles.confirmButton, loading && { opacity: 0.7 }]}
                onPress={() => exerciseToDelete && handleDeleteExercise(exerciseToDelete.id)}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.confirmButtonText}>Excluir</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Exercícios</Text>
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowAddModal(true)}
        >
          <Plus size={20} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchInputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar exercício..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <View style={styles.clearButton}>
                <Text style={styles.clearButtonText}>×</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
        
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.exercisesList}
      >
        {filteredExercises.map(exercise => renderExerciseCard(exercise))}
      </ScrollView>

      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowAddModal(false);
          setEditingExercise(null);
          setFormData({
            name: '',
            equipment: '',
            videoUrl: '',
            description: '',
          });
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingExercise ? 'Editar Exercício' : 'Novo Exercício'}
              </Text>
              <TouchableOpacity 
                onPress={() => {
                  setShowAddModal(false);
                  setEditingExercise(null);
                  setFormData({
                    name: '',
                    equipment: '',
                    videoUrl: '',
                    description: '',
                  });
                }}
              >
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Nome do Exercício</Text>
                <View>
                  <TextInput
                    style={[
                      styles.input,
                      { 
                        backgroundColor: colors.card,
                        borderColor: formErrors.name ? '#EF4444' : colors.border,
                        color: colors.text
                      }
                    ]}
                    placeholder="Ex: Supino"
                    placeholderTextColor={colors.textSecondary}
                    value={formData.name}
                    onChangeText={(text) => {
                      setFormData(prev => ({ ...prev, name: text }));
                      if (formErrors.name) {
                        setFormErrors(prev => ({ ...prev, name: undefined }));
                      }
                    }}
                  />
                  {formErrors.name && (
                    <View style={styles.errorContainer}>
                      <AlertCircle size={16} color="#EF4444" />
                      <Text style={styles.errorText}>{formErrors.name}</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Equipamento Necessário</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }
                  ]}
                  placeholder="Ex: Barra e Anilhas"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.equipment}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, equipment: text }))}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>URL de Vídeos</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }
                  ]}
                  placeholder="Ex: https://youtube.com/..."
                  placeholderTextColor={colors.textSecondary}
                  value={formData.videoUrl}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, videoUrl: text }))}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Descrição e Instruções</Text>
                <TextInput
                  style={[
                    styles.textArea,
                    { 
                      backgroundColor: colors.card,
                      borderColor: formErrors.description ? '#EF4444' : colors.border,
                      color: colors.text
                    }
                  ]}
                  placeholder="Descreva a execução correta do exercício..."
                  placeholderTextColor={colors.textSecondary}
                  value={formData.description}
                  onChangeText={(text) => {
                    setFormData(prev => ({ ...prev, description: text }));
                    if (formErrors.description) {
                      setFormErrors(prev => ({ ...prev, description: undefined }));
                    }
                  }}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                {formErrors.description && (
                  <View style={styles.errorContainer}>
                    <AlertCircle size={16} color="#EF4444" />
                    <Text style={styles.errorText}>{formErrors.description}</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>Salvar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
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
    fontSize: 28,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,

  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
  },
  clearButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 20,
    textAlign: 'center',
  },
  filterButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  exercisesList: {
    padding: 20,
    paddingBottom: 100,
  },
  exerciseCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  exerciseContent: {
    padding: 16,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
  },
  exerciseActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  exerciseDescription: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    marginBottom: 12,
  },
  exerciseMeta: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  equipmentTag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  equipmentText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    borderRadius: 16,
    padding: 20,
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
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    minHeight: 120,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  errorText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#EF4444',
    marginLeft: 6,
  },
  saveButton: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: 'white',
  },
  deleteModalContent: {
    width: '90%',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  deleteIconContainer: {
    marginBottom: 16,
  },
  deleteIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  deleteMessage: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  deleteActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    gap: 12,
  },
  deleteButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  confirmButton: {
    backgroundColor: '#EF4444',
  },
  deleteButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
  },
  headerIcon: {
    marginRight: 10,
  },
  confirmButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: 'white',
  },
});
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { ChevronLeft, Calendar, Dumbbell, Clock } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '@/lib/supabase';

interface WorkoutPlan {
  id_fichas_treino: string;
  nome: string;
  descricao: string | null;
  nivel: 'iniciante' | 'intermediário' | 'avançado' | null;
  objetivo: string | null;
  duracao_treino: string | null;
  modalidade: string | null;
}

export default function AddWorkoutToClientScreen() {
  const { colors } = useTheme();
  const { client_id, workout_id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [workout, setWorkout] = useState<WorkoutPlan | null>(null);
  const [sessao, setSessao] = useState<'A' | 'B' | 'C' | 'D' | 'E' | null>(null);
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split('T')[0]);
  const [dataFim, setDataFim] = useState('');

  useEffect(() => {
    if (workout_id) {
      fetchWorkoutDetails();
    }
  }, [workout_id]);

  const fetchWorkoutDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('treinos')
        .select('*')
        .eq('id_fichas_treino', workout_id)
        .single();

      if (error) throw error;
      setWorkout(data);
    } catch (error) {
      console.error('Erro ao buscar detalhes do treino:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWorkoutToClient = async () => {
    if (!client_id || !workout_id) {
      Alert.alert('Erro', 'Informações de cliente ou treino não encontradas');
      return;
    }

    setSubmitting(true);
    try {
      // Verificar se já existe um treino ativo para esta aluna
      const { data: existingWorkouts, error: checkError } = await supabase
        .from('aluna_fichas')
        .select('id')
        .eq('aluna_id', client_id)
        .eq('ficha_id', workout_id)
        .eq('ativo', true);

      if (checkError) throw checkError;

      if (existingWorkouts && existingWorkouts.length > 0) {
        Alert.alert(
          'Treino já existe',
          'Esta aluna já possui este treino ativo. Deseja adicionar mesmo assim?',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Adicionar', onPress: () => addWorkout() }
          ]
        );
      } else {
        addWorkout();
      }
    } catch (error) {
      console.error('Erro ao verificar treinos existentes:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao verificar treinos existentes');
      setSubmitting(false);
    }
  };

  const addWorkout = async () => {
    try {
      const { data, error } = await supabase
        .from('aluna_fichas')
        .insert([
          {
            aluna_id: client_id,
            ficha_id: workout_id,
            ativo: true,
            data_inicio: dataInicio,
            data_fim: dataFim || null,
            sessao: sessao
          }
        ])
        .select();

      if (error) throw error;

      Alert.alert(
        'Sucesso',
        'Treino adicionado com sucesso!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Erro ao adicionar treino para aluna:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao adicionar o treino');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Carregando detalhes do treino...</Text>
      </View>
    );
  }

  if (!workout) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>Treino não encontrado</Text>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: colors.primary }]}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity 
        style={[styles.backButtonTop, { backgroundColor: colors.card }]}
        onPress={() => router.back()}
      >
        <ChevronLeft size={20} color={colors.text} />
      </TouchableOpacity>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>Adicionar Treino</Text>
        
        <View style={[styles.workoutCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.workoutName, { color: colors.text }]}>{workout.nome}</Text>
          
          {workout.descricao && (
            <Text style={[styles.workoutDescription, { color: colors.textSecondary }]}>
              {workout.descricao}
            </Text>
          )}
          
          <View style={styles.workoutDetails}>
            {workout.nivel && (
              <View style={[styles.badge, { backgroundColor: 'rgba(236, 72, 153, 0.1)' }]}>
                <Text style={[styles.badgeText, { color: colors.primary }]}>{workout.nivel}</Text>
              </View>
            )}
            
            {workout.objetivo && (
              <View style={[styles.badge, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Text style={[styles.badgeText, { color: '#10B981' }]}>{workout.objetivo}</Text>
              </View>
            )}
            
            {workout.duracao_treino && (
              <View style={styles.workoutDetail}>
                <Clock size={16} color={colors.primary} />
                <Text style={[styles.workoutDetailText, { color: colors.textSecondary }]}>
                  {workout.duracao_treino}
                </Text>
              </View>
            )}
            
            {workout.modalidade && (
              <View style={styles.workoutDetail}>
                <Dumbbell size={16} color={colors.primary} />
                <Text style={[styles.workoutDetailText, { color: colors.textSecondary }]}>
                  {workout.modalidade}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Informações do Treino</Text>
          
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Sessão (opcional)</Text>
            <View style={[styles.pickerContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Picker
                selectedValue={sessao}
                onValueChange={(itemValue) => setSessao(itemValue)}
                style={[styles.picker, { color: colors.text }]}
                dropdownIconColor={colors.text}
              >
                <Picker.Item label="Selecione uma sessão" value={null} />
                <Picker.Item label="Sessão A" value="A" />
                <Picker.Item label="Sessão B" value="B" />
                <Picker.Item label="Sessão C" value="C" />
                <Picker.Item label="Sessão D" value="D" />
                <Picker.Item label="Sessão E" value="E" />
              </Picker>
            </View>
          </View>
          
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Data de Início</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={dataInicio}
              onChangeText={setDataInicio}
              placeholder="AAAA-MM-DD"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Data de Término (opcional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={dataFim}
              onChangeText={setDataFim}
              placeholder="AAAA-MM-DD"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.primary }, submitting && { opacity: 0.7 }]}
          onPress={handleAddWorkoutToClient}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.submitButtonText}>Adicionar Treino</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  backButtonTop: {
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
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    marginBottom: 20,
    marginTop: 40,
  },
  workoutCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  workoutName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    marginBottom: 8,
  },
  workoutDescription: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    marginBottom: 16,
  },
  workoutDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginRight: 8,
  },
  badgeText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
  },
  workoutDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  workoutDetailText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    marginLeft: 4,
  },
  formSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    marginBottom: 8,
  },
  pickerContainer: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  input: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
  },
  submitButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  submitButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: 'white',
  },
  loadingText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    alignSelf: 'center',
  },
  backButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: 'white',
  },
});
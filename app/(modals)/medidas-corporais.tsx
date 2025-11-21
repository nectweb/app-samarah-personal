import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

interface MedidasCorporaisForm {
  peso: string;
  torax: string;
  cintura: string;
  abdomen: string;
  quadril: string;
  coxa_medial: string;
  panturrilha: string;
  observacoes: string;
  data_prox_medicao: string;
}

export default function MedidasCorporaisScreen() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<MedidasCorporaisForm>({
    peso: '',
    torax: '',
    cintura: '',
    abdomen: '',
    quadril: '',
    coxa_medial: '',
    panturrilha: '',
    observacoes: '',
    data_prox_medicao: '',
  });

  const handleInputChange = (field: keyof MedidasCorporaisForm, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const medidasData = {
        aluna_id: user.id,
        peso: formData.peso ? parseFloat(formData.peso) : null,
        torax: formData.torax ? parseFloat(formData.torax) : null,
        cintura: formData.cintura ? parseFloat(formData.cintura) : null,
        abdomen: formData.abdomen ? parseFloat(formData.abdomen) : null,
        quadril: formData.quadril ? parseFloat(formData.quadril) : null,
        coxa_medial: formData.coxa_medial ? parseFloat(formData.coxa_medial) : null,
        panturrilha: formData.panturrilha ? parseFloat(formData.panturrilha) : null,
        observacoes: formData.observacoes || null,
        data_prox_medicao: formData.data_prox_medicao || null,
      };

      const { error } = await supabase
        .from('medidas_corporais')
        .insert([medidasData]);

      if (error) throw error;

      Alert.alert('Sucesso', 'Medidas salvas com sucesso!');
      router.back();
    } catch (error) {
      Alert.alert('Erro', 'Ocorreu um erro ao salvar as medidas. Tente novamente.');
      console.error('Erro ao salvar medidas:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Peso (kg)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
            value={formData.peso}
            onChangeText={(value) => handleInputChange('peso', value)}
            keyboardType="numeric"
            placeholder="Ex: 65.5"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Tórax (cm)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
            value={formData.torax}
            onChangeText={(value) => handleInputChange('torax', value)}
            keyboardType="numeric"
            placeholder="Ex: 90.0"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Cintura (cm)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
            value={formData.cintura}
            onChangeText={(value) => handleInputChange('cintura', value)}
            keyboardType="numeric"
            placeholder="Ex: 70.0"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Abdômen (cm)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
            value={formData.abdomen}
            onChangeText={(value) => handleInputChange('abdomen', value)}
            keyboardType="numeric"
            placeholder="Ex: 80.0"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Quadril (cm)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
            value={formData.quadril}
            onChangeText={(value) => handleInputChange('quadril', value)}
            keyboardType="numeric"
            placeholder="Ex: 95.0"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Coxa Medial (cm)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
            value={formData.coxa_medial}
            onChangeText={(value) => handleInputChange('coxa_medial', value)}
            keyboardType="numeric"
            placeholder="Ex: 55.0"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Panturrilha (cm)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
            value={formData.panturrilha}
            onChangeText={(value) => handleInputChange('panturrilha', value)}
            keyboardType="numeric"
            placeholder="Ex: 35.0"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Observações</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.text }]}
            value={formData.observacoes}
            onChangeText={(value) => handleInputChange('observacoes', value)}
            multiline
            numberOfLines={4}
            placeholder="Digite suas observações..."
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Data da Próxima Medição</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
            value={formData.data_prox_medicao}
            onChangeText={(value) => handleInputChange('data_prox_medicao', value)}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.primary }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Salvando...' : 'Salvar Medidas'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    fontFamily: 'Poppins-Medium',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Poppins-Bold',
  },
}); 
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Upload } from 'lucide-react-native';

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

interface ImagemMedicao {
  frente: string | null;
  costas: string | null;
  lado: string | null;
}

export default function MedidasCorporaisScreen() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('medidas'); // 'medidas' ou 'fotos'
  const [imagens, setImagens] = useState<ImagemMedicao>({
    frente: null,
    costas: null,
    lado: null
  });
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

  useEffect(() => {
    const hoje = new Date();
    hoje.setDate(hoje.getDate() + 90);
    const dataFormatada = hoje.toISOString().split('T')[0]; // Formato YYYY-MM-DD
    setFormData(prev => ({
      ...prev,
      data_prox_medicao: dataFormatada
    }));
  }, []);

  const handleInputChange = (field: keyof MedidasCorporaisForm, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const pickImage = async (tipo: keyof ImagemMedicao) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setImagens(prev => ({
          ...prev,
          [tipo]: result.assets[0].base64
        }));
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível selecionar a imagem');
    }
  };

  const uploadImage = async (base64Image: string, tipo: string): Promise<string> => {
    try {
      const fileName = `${Date.now()}_${tipo}.jpg`;
      const filePath = `medidas/${fileName}`;
      
      // Convert base64 to Uint8Array
      const binaryString = atob(base64Image);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const { error } = await supabase.storage
        .from('fotos-medidas')
        .upload(filePath, bytes, {
          contentType: 'image/jpeg',
        });

      if (error) throw error;

      const { data } = supabase.storage
        .from('fotos-medidas')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Upload das imagens
      let imagemFrenteUrl = null;
      let imagemCostasUrl = null;
      let imagemLadoUrl = null;

      if (imagens.frente) {
        imagemFrenteUrl = await uploadImage(imagens.frente, 'frente');
      }
      if (imagens.costas) {
        imagemCostasUrl = await uploadImage(imagens.costas, 'costas');
      }
      if (imagens.lado) {
        imagemLadoUrl = await uploadImage(imagens.lado, 'lado');
      }

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
        imagem_frente_url: imagemFrenteUrl,
        imagem_costas_url: imagemCostasUrl,
        imagem_lado_url: imagemLadoUrl,
      };

      const { error } = await supabase
        .from('medidas_corporais')
        .insert([medidasData]);

      if (error) throw error;

      Alert.alert('Sucesso', 'Medidas salvas com sucesso!');
      router.replace('/');
    } catch (error) {
      Alert.alert('Erro', 'Ocorreu um erro ao salvar as medidas. Tente novamente.');
      console.error('Erro ao salvar medidas:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderImageUpload = (tipo: keyof ImagemMedicao, titulo: string) => (
    <TouchableOpacity
      style={[styles.imageUploadButton, { backgroundColor: colors.card }]}
      onPress={() => pickImage(tipo)}
    >
      {imagens[tipo] ? (
        <Image
          source={{ uri: `data:image/jpeg;base64,${imagens[tipo]}` }}
          style={styles.previewImage}
        />
      ) : (
        <View style={styles.uploadPlaceholder}>
          <Camera size={32} color={colors.primary} />
          <Text style={[styles.uploadText, { color: colors.text }]}>{titulo}</Text>
          <Upload size={24} color={colors.primary} style={{ marginTop: 8 }} />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safeContainer, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeSection === 'medidas' && { backgroundColor: colors.primary }
            ]}
            onPress={() => setActiveSection('medidas')}
          >
            <Text style={[
              styles.tabText,
              { color: activeSection === 'medidas' ? '#FFFFFF' : colors.text }
            ]}>Medidas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeSection === 'fotos' && { backgroundColor: colors.primary }
            ]}
            onPress={() => setActiveSection('fotos')}
          >
            <Text style={[
              styles.tabText,
              { color: activeSection === 'fotos' ? '#FFFFFF' : colors.text }
            ]}>Fotos</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          {activeSection === 'medidas' ? (
            <View style={styles.formContainer}>
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Medidas Principais</Text>
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
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Medidas Corporais</Text>
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
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Medidas das Pernas</Text>
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
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Informações Adicionais</Text>
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
                    editable={false}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.photosContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 20 }]}>
                Fotos do Progresso
              </Text>
              <Text style={[styles.photoInstructions, { color: colors.textSecondary }]}>
                Tire as fotos em um ambiente bem iluminado e com fundo neutro para melhor visualização do seu progresso.
              </Text>
              <View style={styles.imageUploadGrid}>
                {renderImageUpload('frente', 'Frente')}
                {renderImageUpload('costas', 'Costas')}
                {renderImageUpload('lado', 'Lado')}
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
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
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  submitButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
  },
  photosContainer: {
    padding: 16,
  },
  photoInstructions: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    marginBottom: 24,
    lineHeight: 20,
  },
  imageUploadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  imageUploadButton: {
    width: '48%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  uploadPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  uploadText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    marginTop: 8,
    textAlign: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
}); 
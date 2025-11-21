import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Modal, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/context/ThemeContext';
import { useLocalSearchParams, router } from 'expo-router';
import { ChevronLeft, Calendar, User, Camera } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Assessment {
  id: string;
  data_medicao: string;
  peso: number;
  altura: number;
  imc: number;
  gordura_corporal: number;
  braco_direito: number;
  braco_esquerdo: number;
  torax: number;
  cintura: number;
  abdomen: number;
  quadril: number;
  coxa_direita: number;
  coxa_esquerda: number;
  panturrilha_direita: number;
  panturrilha_esquerda: number;
  foto_frente: string;
  foto_lado: string;
  foto_costas: string;
  observacoes: string;
  metas: string[];
  aluna_nome: string;
  profissional_nome: string;
}

export default function AssessmentDetailScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams();
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const { width } = Dimensions.get('window');
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAssessmentDetails();
  }, [id]);

  async function fetchAssessmentDetails() {
    try {
      setLoading(true);
      setError(null);

      const { data: assessmentData, error: assessmentError } = await supabase
        .from('medidas_corporais')
        .select(`
          *,
          aluna:aluna_id(nome)
        `)
        .eq('id', id)
        .single();

      if (assessmentError) throw assessmentError;

      if (assessmentData) {
        setAssessment({
          id: assessmentData.id,
          data_medicao: format(new Date(assessmentData.data_medicao), 'dd \'de\' MMMM, yyyy', { locale: ptBR }),
          peso: assessmentData.peso || 0,
          altura: assessmentData.altura || 0,
          imc: assessmentData.imc || 0,
          gordura_corporal: assessmentData.gordura_corporal || 0,
          braco_direito: assessmentData.braco_direito || 0,
          braco_esquerdo: assessmentData.braco_esquerdo || 0,
          torax: assessmentData.torax || 0,
          cintura: assessmentData.cintura || 0,
          abdomen: assessmentData.abdomen || 0,
          quadril: assessmentData.quadril || 0,
          coxa_direita: assessmentData.coxa_direita || 0,
          coxa_esquerda: assessmentData.coxa_esquerda || 0,
          panturrilha_direita: assessmentData.panturrilha_direita || 0,
          panturrilha_esquerda: assessmentData.panturrilha_esquerda || 0,
          foto_frente: assessmentData.foto_frente || require('@/assets/images/placeholder.png'),
          foto_lado: assessmentData.foto_lado || require('@/assets/images/placeholder.png'),
          foto_costas: assessmentData.foto_costas || require('@/assets/images/placeholder.png'),
          observacoes: assessmentData.observacoes || '',
          metas: assessmentData.metas || [],
          aluna_nome: assessmentData.aluna?.nome || '',
          profissional_nome: assessmentData.profissional_nome || ''
        });
      }
    } catch (error: any) {
      console.error('Erro ao buscar detalhes da avaliação:', error.message);
      setError('Não foi possível carregar os detalhes da avaliação');
    } finally {
      setLoading(false);
    }
  }

  const handlePhotoPress = (photo) => {
    setSelectedPhoto(photo);
    setPhotoModalVisible(true);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Carregando avaliação...</Text>
      </View>
    );
  }

  if (error || !assessment) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>{error || 'Avaliação não encontrada'}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity 
        style={[styles.backButton, { backgroundColor: colors.card }]}
        onPress={() => router.back()}
      >
        <ChevronLeft size={20} color={colors.text} />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.headerDate, { color: colors.primary }]}>{assessment.data_medicao}</Text>
          <Text style={[styles.headerType, { color: colors.textSecondary }]}>Avaliação Física</Text>
          
          <View style={styles.clientInfo}>
            <View style={styles.infoItem}>
              <User size={16} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                Cliente: <Text style={{ fontFamily: 'Poppins-SemiBold' }}>{assessment.aluna_nome}</Text>
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <User size={16} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                Profissional: <Text style={{ fontFamily: 'Poppins-SemiBold' }}>{assessment.profissional_nome}</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Main Measurements */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Medidas Principais</Text>
          
          <View style={styles.mainMeasurements}>
            <View style={styles.measurementItem}>
              <Text style={[styles.measurementLabel, { color: colors.textSecondary }]}>Peso</Text>
              <Text style={[styles.measurementValue, { color: colors.text }]}>
                {assessment.peso} <Text style={styles.measurementUnit}>kg</Text>
              </Text>
            </View>
            
            <View style={styles.measurementItem}>
              <Text style={[styles.measurementLabel, { color: colors.textSecondary }]}>Altura</Text>
              <Text style={[styles.measurementValue, { color: colors.text }]}>
                {assessment.altura} <Text style={styles.measurementUnit}>m</Text>
              </Text>
            </View>
            
            <View style={styles.measurementItem}>
              <Text style={[styles.measurementLabel, { color: colors.textSecondary }]}>IMC</Text>
              <Text style={[styles.measurementValue, { color: colors.text }]}>
                {assessment.imc}
                <Text style={[styles.bmiStatus, { color: '#10B981' }]}> {assessment.imc < 18.5 ? 'Abaixo do peso' : assessment.imc < 25 ? 'Peso normal' : assessment.imc < 30 ? 'Sobrepeso' : 'Obesidade'}</Text>
              </Text>
            </View>
            
            <View style={styles.measurementItem}>
              <Text style={[styles.measurementLabel, { color: colors.textSecondary }]}>% Gordura</Text>
              <Text style={[styles.measurementValue, { color: colors.text }]}>
                {assessment.gordura_corporal}%
                <Text style={[styles.fatStatus, { color: '#3B82F6' }]}> {assessment.gordura_corporal < 20 ? 'Baixo' : assessment.gordura_corporal < 25 ? 'Normal' : assessment.gordura_corporal < 30 ? 'Moderado' : 'Alto'}</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Detailed Measurements */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Medidas Detalhadas (cm)</Text>
          
          <View style={styles.measurementSection}>
            <Text style={[styles.sectionLabel, { color: colors.primary }]}>Membros Superiores</Text>
            <View style={styles.measurementRow}>
              <View style={styles.detailedMeasurementItem}>
                <Text style={[styles.measurementLabel, { color: colors.textSecondary }]}>Braço Dir.</Text>
                <Text style={[styles.measurementValue, { color: colors.text }]}>
                  {assessment.braco_direito}
                </Text>
              </View>
              
              <View style={styles.detailedMeasurementItem}>
                <Text style={[styles.measurementLabel, { color: colors.textSecondary }]}>Braço Esq.</Text>
                <Text style={[styles.measurementValue, { color: colors.text }]}>
                  {assessment.braco_esquerdo}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.measurementSection}>
            <Text style={[styles.sectionLabel, { color: colors.primary }]}>Tronco</Text>
            <View style={styles.measurementRow}>
              <View style={styles.detailedMeasurementItem}>
                <Text style={[styles.measurementLabel, { color: colors.textSecondary }]}>Tórax</Text>
                <Text style={[styles.measurementValue, { color: colors.text }]}>
                  {assessment.torax}
                </Text>
              </View>
              
              <View style={styles.detailedMeasurementItem}>
                <Text style={[styles.measurementLabel, { color: colors.textSecondary }]}>Cintura</Text>
                <Text style={[styles.measurementValue, { color: colors.text }]}>
                  {assessment.cintura}
                </Text>
              </View>
            </View>
            
            <View style={styles.measurementRow}>
              <View style={styles.detailedMeasurementItem}>
                <Text style={[styles.measurementLabel, { color: colors.textSecondary }]}>Abdômen</Text>
                <Text style={[styles.measurementValue, { color: colors.text }]}>
                  {assessment.abdomen}
                </Text>
              </View>
              
              <View style={styles.detailedMeasurementItem}>
                <Text style={[styles.measurementLabel, { color: colors.textSecondary }]}>Quadril</Text>
                <Text style={[styles.measurementValue, { color: colors.text }]}>
                  {assessment.quadril}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.measurementSection}>
            <Text style={[styles.sectionLabel, { color: colors.primary }]}>Membros Inferiores</Text>
            <View style={styles.measurementRow}>
              <View style={styles.detailedMeasurementItem}>
                <Text style={[styles.measurementLabel, { color: colors.textSecondary }]}>Coxa Dir.</Text>
                <Text style={[styles.measurementValue, { color: colors.text }]}>
                  {assessment.coxa_direita}
                </Text>
              </View>
              
              <View style={styles.detailedMeasurementItem}>
                <Text style={[styles.measurementLabel, { color: colors.textSecondary }]}>Coxa Esq.</Text>
                <Text style={[styles.measurementValue, { color: colors.text }]}>
                  {assessment.coxa_esquerda}
                </Text>
              </View>
            </View>
            
            <View style={styles.measurementRow}>
              <View style={styles.detailedMeasurementItem}>
                <Text style={[styles.measurementLabel, { color: colors.textSecondary }]}>Panturrilha Dir.</Text>
                <Text style={[styles.measurementValue, { color: colors.text }]}>
                  {assessment.panturrilha_direita}
                </Text>
              </View>
              
              <View style={styles.detailedMeasurementItem}>
                <Text style={[styles.measurementLabel, { color: colors.textSecondary }]}>Panturrilha Esq.</Text>
                <Text style={[styles.measurementValue, { color: colors.text }]}>
                  {assessment.panturrilha_esquerda}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Photo Gallery */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Registro Fotográfico</Text>
          
          <View style={styles.photoGallery}>
            <TouchableOpacity 
              style={styles.photoContainer}
              onPress={() => handlePhotoPress(assessment.foto_frente)}
            >
              <Text style={[styles.photoLabel, { color: colors.textSecondary }]}>Frente</Text>
              {typeof assessment.foto_frente === 'string' ? (
                <Image
                  source={{ uri: assessment.foto_frente }}
                  style={[styles.photoPlaceholder, { backgroundColor: colors.border }]}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.photoPlaceholder, { backgroundColor: colors.border }]}>
                  <Camera size={24} color={colors.textSecondary} />
                </View>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.photoContainer}
              onPress={() => handlePhotoPress(assessment.foto_lado)}
            >
              <Text style={[styles.photoLabel, { color: colors.textSecondary }]}>Lateral</Text>
              {typeof assessment.foto_lado === 'string' ? (
                <Image
                  source={{ uri: assessment.foto_lado }}
                  style={[styles.photoPlaceholder, { backgroundColor: colors.border }]}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.photoPlaceholder, { backgroundColor: colors.border }]}>
                  <Camera size={24} color={colors.textSecondary} />
                </View>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.photoContainer}
              onPress={() => handlePhotoPress(assessment.foto_costas)}
            >
              <Text style={[styles.photoLabel, { color: colors.textSecondary }]}>Costas</Text>
              {typeof assessment.foto_costas === 'string' ? (
                <Image
                  source={{ uri: assessment.foto_costas }}
                  style={[styles.photoPlaceholder, { backgroundColor: colors.border }]}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.photoPlaceholder, { backgroundColor: colors.border }]}>
                  <Camera size={24} color={colors.textSecondary} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Notes */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Observações da Personal</Text>
          <Text style={[styles.notesText, { color: colors.textSecondary }]}>
            {assessment.observacoes}
          </Text>
          
          <View style={styles.goalsList}>
            {assessment.metas.map((goal, index) => (
              <View key={index} style={styles.goalItem}>
                <View style={[styles.goalNumber, { backgroundColor: colors.primary }]}>
                  <Text style={styles.goalNumberText}>{index + 1}</Text>
                </View>
                <Text style={[styles.goalText, { color: colors.text }]}>{goal}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Full Screen Photo Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={photoModalVisible}
        onRequestClose={() => setPhotoModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.closeModalButton}
            onPress={() => setPhotoModalVisible(false)}
          >
            <ChevronLeft size={24} color="white" />
          </TouchableOpacity>
          
          {selectedPhoto && (
            <Image
              source={selectedPhoto}
              style={styles.fullScreenPhoto}
              contentFit="contain"
            />
          )}
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
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 8,
    borderRadius: 8,
  },
  header: {
    paddingTop: 100,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerDate: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    marginBottom: 4,
  },
  headerType: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    marginBottom: 16,
  },
  clientInfo: {
    gap: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
  },
  card: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
  },
  cardTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    marginBottom: 16,
  },
  mainMeasurements: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  measurementItem: {
    width: '48%',
    marginBottom: 16,
  },
  measurementLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    marginBottom: 4,
  },
  measurementValue: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
  },
  measurementUnit: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
  },
  bmiStatus: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
  },
  fatStatus: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
  },
  measurementSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    marginBottom: 12,
  },
  measurementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailedMeasurementItem: {
    width: '48%',
  },
  photoGallery: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  photoContainer: {
    width: '30%',
    alignItems: 'center',
  },
  photoLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    marginBottom: 8,
  },
  photoPlaceholder: {
    width: '100%',
    aspectRatio: 3/4,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notesText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  goalsList: {
    marginTop: 16,
    gap: 12,
  },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  goalNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalNumberText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 12,
    color: 'white',
  },
  goalText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeModalButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  fullScreenPhoto: {
    width: '100%',
    height: '80%',
  },
  bottomPadding: {
    height: 40,
  },
});
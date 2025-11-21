import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Animated, Alert } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Calendar, TrendingUp, ChevronRight, Scale, ArrowUpRight, ArrowDownRight, Plus, Lock } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { format, isAfter, isToday, parseISO } from 'date-fns';
import { LineChart } from 'react-native-chart-kit';

interface MedidasCorporais {
  id: string;
  data_medicao: string;
  peso: number | null;
  torax: number | null;
  cintura: number | null;
  abdomen: number | null;
  quadril: number | null;
  coxa_medial: number | null;
  panturrilha: number | null;
  observacoes: string | null;
  obs_profissional: string | null;
  data_prox_medicao: string | null;
}

interface ProgressData {
  labels: string[];
  datasets: { data: number[] }[];
}

// Função de navegação simplificada e mais confiável
const safeNavigate = (path: string) => {
  console.log('🔍 ASSESSMENTS - safeNavigate chamada');
  console.log('🔍 ASSESSMENTS - path:', path);
  console.log('🔍 ASSESSMENTS - stack trace:', new Error().stack);
  
  // Lista de rotas válidas no aplicativo
  const validRoutes = [
    '/anamnese',
    '/assessment-detail',
    '/assessments',
    '/change-password',
    '/chat',
    '/index',
    '/medidas-corporais', 
    '/payments',
    '/profile-details',
    '/settings',
    '/student-workouts',
    '/workout-exercises',
    '/(tabs)', // Para navegação de tabs
    '/'       // Rota raiz
  ];
  
  try {
    // Adiciona '/' se não existir no início do caminho
    const formattedPath = path.startsWith('/') ? path : `/${path}`;
    
    // Verifica se a rota é válida
    // Considera como válidas as rotas que começam com alguma rota da lista
    // para permitir queries como '/assessment-detail?id=123'
    const isValidRoute = validRoutes.some(route => 
      formattedPath === route || 
      (formattedPath.startsWith(route) && formattedPath.charAt(route.length) === '?')
    );
    
    if (!isValidRoute) {
      console.error(`Rota inválida: ${formattedPath}. Navegação cancelada.`);
      Alert.alert(
        "Rota inválida",
        `A rota ${formattedPath} não existe no aplicativo.`,
        [{ text: "OK", style: "default" }]
      );
      return false;
    }
    
    router.push(formattedPath);
    console.log(`Navegação para ${formattedPath} iniciada com sucesso`);
    return true;
  } catch (error) {
    console.error('Erro na navegação:', error);
    Alert.alert(
      "Erro de navegação",
      `Não foi possível navegar para ${path}. Por favor, tente novamente.`
    );
    return false;
  }
};

export default function AssessmentsScreen() {
  const { colors } = useTheme();
  const [medidas, setMedidas] = useState<MedidasCorporais[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progressData, setProgressData] = useState<ProgressData>({ labels: [], datasets: [{ data: [] }] });
  const [fadeAnim] = useState(new Animated.Value(0));
  const [isAdmin, setIsAdmin] = useState(false);
  const [observacoes, setObservacoes] = useState('');
  const [canAddAssessment, setCanAddAssessment] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    fetchMedidas();
    checkUserRole();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  // Monitora mudanças de foco para detectar navegação de volta
  useFocusEffect(
    React.useCallback(() => {
      console.log('Tela de avaliações em foco');
      setIsNavigating(false);
      return () => {
        console.log('Tela de avaliações perdeu o foco');
      };
    }, [])
  );

  useEffect(() => {
    if (medidas.length > 0) {
      checkIfCanAddAssessment();
    }
  }, [medidas]);

  async function checkUserRole() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('users')
        .select('admin')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setIsAdmin(data?.admin || false);
    } catch (err) {
      console.error('Erro ao verificar papel do usuário:', err);
    }
  }
  async function fetchMedidas() {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não encontrado');

      const { data, error } = await supabase
        .from('medidas_corporais')
        .select('*')
        .eq('aluna_id', user.id)
        .order('data_medicao', { ascending: false });

      if (data && data.length > 0) {
        const lastFiveMeasurements = data.slice(0, 5).reverse();
        const labels = lastFiveMeasurements.map(m => format(new Date(m.data_medicao), 'MMM'));
        const weightData = lastFiveMeasurements.map(m => m.peso || 0);
        
        setProgressData({
          labels,
          datasets: [{ data: weightData }]
        });
      }

      if (error) throw error;
      setMedidas(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar medidas:', err.message);
      setError('Não foi possível carregar as avaliações');
    } finally {
      setLoading(false);
    }
  }
  
  const handleAssessmentPress = (assessmentId: string) => {
    router.push(`/assessment-detail?id=${assessmentId}`);
  };

  const checkIfCanAddAssessment = () => {
    if (!medidas.length || !medidas[0].data_prox_medicao) {
      // Se não houver medidas ou data próxima, permitir adicionar
      setCanAddAssessment(true);
      return;
    }

    const today = new Date();
    const nextAssessmentDate = parseISO(medidas[0].data_prox_medicao);
    
    // Pode adicionar se for hoje ou após a data da próxima avaliação
    setCanAddAssessment(isToday(nextAssessmentDate) || isAfter(today, nextAssessmentDate));
  };

  const handleAddAssessment = () => {
    if (!canAddAssessment) {
      const nextDate = medidas[0]?.data_prox_medicao 
        ? format(parseISO(medidas[0].data_prox_medicao), 'dd/MM/yyyy')
        : 'programada';
        
      Alert.alert(
        'Avaliação Bloqueada',
        `Você só poderá adicionar uma nova avaliação na data ${nextDate}.`,
        [{ text: 'Entendi', style: 'default' }]
      );
      return;
    }
    
    router.push('/medidas-corporais');
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Carregando avaliações...</Text>
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

  const chartConfig = {
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(236, 72, 153, ${opacity})`,
    labelColor: () => colors.textSecondary,
    style: { borderRadius: 16 },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#EC4899',
      fill: 'white',
    },
    withHorizontalLines: true,
    withVerticalLines: false,
    withInnerLines: false,
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView 
        style={[styles.container, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <Text style={[styles.title, { color: colors.text }]}>Avaliações</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Acompanhe sua evolução</Text>
        </Animated.View>

        {/* Botão de Anamnese */}
        <TouchableOpacity 
          style={[styles.anamneseButton, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
          onPress={() => {
            // Evita navegação dupla ou múltipla
            if (isNavigating) {
              console.log('Navegação já em andamento, ignorando clique');
              return;
            }
            
            console.log('=== ASSESSMENTS: Botão anamnese pressionado ===');
            setIsNavigating(true);
            
            // Usando a função de navegação segura
            safeNavigate('/anamnese');
          }}
          disabled={isNavigating}
        >
          <Text style={styles.anamneseButtonText}>Faça sua anamnese</Text>
        </TouchableOpacity>

        {medidas[0] && (
          <Animated.View 
            style={[
              styles.nextAssessmentCard, 
              { 
                backgroundColor: colors.primary, 
                opacity: fadeAnim,
                transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] 
              }
            ]}
          >
            <Calendar size={24} color="#FFFFFF" />
            <View style={styles.nextAssessmentContent}>
              <Text style={styles.nextAssessmentLabel}>Próxima Avaliação</Text>
              <Text style={styles.nextAssessmentDate}>
                {medidas[0].data_prox_medicao 
                  ? format(new Date(medidas[0].data_prox_medicao), 'dd/MM/yyyy') 
                  : '...'}
              </Text>
            </View>
          </Animated.View>
        )}

        <View style={[styles.progressCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Progresso do Peso</Text>
          <View style={styles.chartContainer}>
            <LineChart
              data={progressData}
              width={Dimensions.get('window').width - 80}
              height={220}
              chartConfig={{
                ...chartConfig,
                propsForLabels: {
                  fontSize: 12,
                  fontFamily: 'Poppins-Regular',
                },
                paddingRight: 48,
                paddingTop: 20,
              }}
              bezier
              style={styles.chart}
              withDots={true}
              withShadow={false}
              withVerticalLines={false}
              withHorizontalLines={true}
              withVerticalLabels={true}
              withHorizontalLabels={true}
              fromZero={false}
              yAxisLabel=""
              yAxisSuffix=" kg"
              segments={5}
            />
          </View>
        </View>

        <View style={styles.measurementsGrid}>
          {medidas[0] && (
            <>
              <Animated.View style={[styles.measurementCard, { backgroundColor: colors.card, opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }] }]}>
                <Text style={[styles.measurementTitle, { color: colors.textSecondary }]}>Cintura</Text>
                <Text style={[styles.measurementValue, { color: colors.text }]}>{medidas[0].cintura || 0} cm</Text>
                <View style={styles.progressIndicator}>
                  {medidas[1] && medidas[0].cintura !== null && medidas[1].cintura !== null && medidas[0].cintura < medidas[1].cintura ? (
                    <>
                      <ArrowDownRight size={16} color="#10B981" />
                      <Text style={[styles.progressText, { color: '#10B981' }]}>-{((medidas[1].cintura || 0) - (medidas[0].cintura || 0)).toFixed(1)} cm</Text>
                    </>
                  ) : (
                    <>
                      <ArrowUpRight size={16} color="#EF4444" />
                      <Text style={[styles.progressText, { color: '#EF4444' }]}>+{((medidas[0].cintura || 0) - (medidas[1]?.cintura || 0)).toFixed(1)} cm</Text>
                    </>
                  )}
                </View>
              </Animated.View>

              <Animated.View style={[styles.measurementCard, { backgroundColor: colors.card, opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }] }]}>
                <Text style={[styles.measurementTitle, { color: colors.textSecondary }]}>Quadril</Text>
                <Text style={[styles.measurementValue, { color: colors.text }]}>{medidas[0].quadril || 0} cm</Text>
                <View style={styles.progressIndicator}>
                  {medidas[1] && medidas[0].quadril !== null && medidas[1].quadril !== null && medidas[0].quadril < medidas[1].quadril ? (
                    <>
                      <ArrowDownRight size={16} color="#10B981" />
                      <Text style={[styles.progressText, { color: '#10B981' }]}>-{((medidas[1].quadril || 0) - (medidas[0].quadril || 0)).toFixed(1)} cm</Text>
                    </>
                  ) : (
                    <>
                      <ArrowUpRight size={16} color="#EF4444" />
                      <Text style={[styles.progressText, { color: '#EF4444' }]}>+{((medidas[0].quadril || 0) - (medidas[1]?.quadril || 0)).toFixed(1)} cm</Text>
                    </>
                  )}
                </View>
              </Animated.View>

              <Animated.View style={[styles.measurementCard, { backgroundColor: colors.card, opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }] }]}>
                <Text style={[styles.measurementTitle, { color: colors.textSecondary }]}>Abdômen</Text>
                <Text style={[styles.measurementValue, { color: colors.text }]}>{medidas[0].abdomen || 0} cm</Text>
                <View style={styles.progressIndicator}>
                  {medidas[1] && medidas[0].abdomen !== null && medidas[1].abdomen !== null && medidas[0].abdomen < medidas[1].abdomen ? (
                    <>
                      <ArrowDownRight size={16} color="#10B981" />
                      <Text style={[styles.progressText, { color: '#10B981' }]}>-{((medidas[1].abdomen || 0) - (medidas[0].abdomen || 0)).toFixed(1)} cm</Text>
                    </>
                  ) : (
                    <>
                      <ArrowUpRight size={16} color="#EF4444" />
                      <Text style={[styles.progressText, { color: '#EF4444' }]}>+{((medidas[0].abdomen || 0) - (medidas[1]?.abdomen || 0)).toFixed(1)} cm</Text>
                    </>
                  )}
                </View>
              </Animated.View>

              <Animated.View style={[styles.measurementCard, { backgroundColor: colors.card, opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }] }]}>
                <Text style={[styles.measurementTitle, { color: colors.textSecondary }]}>Coxa</Text>
                <Text style={[styles.measurementValue, { color: colors.text }]}>{medidas[0].coxa_medial || 0} cm</Text>
                <View style={styles.progressIndicator}>
                  {medidas[1] && medidas[0].coxa_medial !== null && medidas[1].coxa_medial !== null && medidas[0].coxa_medial < medidas[1].coxa_medial ? (
                    <>
                      <ArrowDownRight size={16} color="#10B981" />
                      <Text style={[styles.progressText, { color: '#10B981' }]}>-{((medidas[1].coxa_medial || 0) - (medidas[0].coxa_medial || 0)).toFixed(1)} cm</Text>
                    </>
                  ) : (
                    <>
                      <ArrowUpRight size={16} color="#EF4444" />
                      <Text style={[styles.progressText, { color: '#EF4444' }]}>+{((medidas[0].coxa_medial || 0) - (medidas[1]?.coxa_medial || 0)).toFixed(1)} cm</Text>
                    </>
                  )}
                </View>
              </Animated.View>
            </>
          )}
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Calendar size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Histórico de Avaliações</Text>
          </View>
          
          <View style={styles.assessmentsList}>
            {medidas.map((medida, index) => (
              <TouchableOpacity 
                key={medida.id}
                style={[
                  styles.assessmentItem, 
                  { backgroundColor: index % 2 === 0 ? `${colors.primary}05` : 'transparent' },
                  index === medidas.length - 1 && styles.lastAssessmentItem
                ]}
                onPress={() => handleAssessmentPress(medida.id)}
              >
                <View style={styles.assessmentInfo}>
                  <View style={styles.dateContainer}>
                    <Calendar size={16} color={colors.primary} style={styles.icon} />
                    <Text style={[styles.assessmentDate, { color: colors.text }]}>
                      {format(new Date(medida.data_medicao), 'dd/MM/yyyy')}
                    </Text>
                  </View>
                  
                  <View style={styles.weightContainer}>
                    <TrendingUp size={16} color={colors.primary} style={styles.icon} />
                    <Text style={[styles.assessmentWeight, { color: colors.primary }]}>
                      {medida.peso ? `${medida.peso} kg` : 'N/A'}
                    </Text>
                  </View>
                </View>
                
                <ChevronRight size={18} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {isAdmin && medidas[0]?.observacoes && (
          <View style={[styles.section, { backgroundColor: colors.card }]}> 
            <View style={styles.sectionHeader}> 
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Observações Profissionais</Text> 
            </View> 
            <Text style={[styles.observationText, { color: colors.text }]}> 
              {medidas[0].observacoes}
            </Text> 
          </View>
        )}

        <View style={[styles.section, { backgroundColor: colors.card }]}> 
          <View style={styles.sectionHeader}> 
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Observação Profissional</Text> 
          </View> 
          <Text style={[styles.observationText, { color: colors.text }]}> 
            {medidas[0]?.obs_profissional ? medidas[0].obs_profissional : 'Nenhuma observação profissional registrada.'} 
          </Text> 
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <TouchableOpacity 
        style={[
          styles.addButton, 
          { 
            backgroundColor: canAddAssessment ? colors.primary : colors.textSecondary,
            opacity: canAddAssessment ? 1 : 0.7
          }
        ]}
        onPress={handleAddAssessment}
      >
        {canAddAssessment ? (
          <Plus size={24} color="#FFFFFF" />
        ) : (
          <Lock size={24} color="#FFFFFF" />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  measurementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  measurementCard: {
    width: '48%',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  measurementTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    marginBottom: 8,
  },
  measurementValue: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    marginBottom: 4,
  },
  progressIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    marginLeft: 4,
  },
  subtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    marginTop: 4,
  },
  progressCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  cardTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    marginHorizontal: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 16,
    borderRadius: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    marginLeft: 8,
  },
  assessmentsList: {
    marginTop: 12,
  },
  assessmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  lastAssessmentItem: {
    marginBottom: 0,
  },
  assessmentInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 6,
  },
  assessmentDate: {
    fontFamily: 'Poppins-Medium',
    fontSize: 15,
  },
  assessmentWeight: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
  },
  bottomPadding: {
    height: 100,
  },
  observationText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  addButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  nextAssessmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nextAssessmentContent: {
    marginLeft: 12,
    flex: 1,
  },
  nextAssessmentLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  nextAssessmentDate: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: '#FFFFFF',
    marginTop: 2,
  },
  anamneseButton: {
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  anamneseButtonText: {
    color: 'white',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
  },
});
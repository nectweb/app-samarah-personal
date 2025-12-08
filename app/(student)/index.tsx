import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { DEFAULT_PROFILE_IMAGE } from '@/constants/images';
import { LineChart } from 'react-native-chart-kit';
import { Platform } from 'react-native';
import { Play, Calendar, Bell, CreditCard, ChevronRight, TrendingUp, Scale, Ruler, Dumbbell } from 'lucide-react-native';
import WeeklyWorkoutCard from '@/components/WeeklyWorkoutCard';
import CycleProgressCard from '@/components/CycleProgressCard';

// Sample data for the weight progress chart
const weightData = {
  labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai'],
  datasets: [{
    data: [75, 74, 72.5, 71.8, 70.2],
  }],
};

const motivationalMessages = [
  'Pronta para mais um dia de conquistas?',
  'Vamos fazer deste treino algo incrível!',
  'Cada treino é uma oportunidade de evolução!',
  'Hoje é dia de superar seus limites!',
  'Determinação e foco te levam mais longe!',
  'Seu corpo é capaz de coisas incríveis!',
  'Transforme seu esforço em resultados!',
  'A disciplina é a chave do sucesso!',
  'Cada gota de suor vale a pena!',
  'Você está mais forte a cada dia!'
];

// Interfaces para tipagem
interface UserData {
  nome?: string;
  foto?: string;
  [key: string]: any;
}

interface EvolucaoData {
  peso_atual?: number;
  diferenca_peso?: number;
  cintura_atual?: number;
  [key: string]: any;
}

const formatDisplayName = (name?: string) => {
  if (!name) {
    return 'Aluna';
  }
  const nameParts = name.trim().split(' ').filter(Boolean);
  if (nameParts.length > 1) {
    return `${nameParts[0]} ${nameParts[nameParts.length - 1]}`;
  }
  return name;
};

export default function StudentDashboard() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [evolucaoData, setEvolucaoData] = useState<EvolucaoData | null>(null);
  const [weightChartData, setWeightChartData] = useState(weightData);
  const [motivationalMessage] = useState(() => 
    motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)]
  );
  const [avaliacoesCount, setAvaliacoesCount] = useState(0);

  useEffect(() => {
    async function fetchUserData() {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        setUserData(data);

        // Buscar dados de evolução
        const { data: evolucao, error: evolucaoError } = await supabase
          .from('view_evolucao_medidas')
          .select('*')
          .eq('aluna_id', user.id)
          .maybeSingle();

        // Silenciosamente lidar com erros de evolução - não exibir no console
        setEvolucaoData(evolucao || {
          peso_atual: 0,
          diferenca_peso: 0,
          cintura_atual: 0
        });

        // Buscar histórico de peso dos últimos 5 meses
        const { data: medidasHistorico, error: medidasError } = await supabase
          .from('medidas_corporais')
          .select('data_medicao, peso')
          .eq('aluna_id', user.id)
          .order('data_medicao', { ascending: true })
          .limit(5);

        // Silenciosamente lidar com erros de medidas
        if (medidasError || !medidasHistorico || medidasHistorico.length === 0) {
          setAvaliacoesCount(0);
          // Definir dados padrão para o gráfico quando não há medidas
          setWeightChartData({
            labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai'],
            datasets: [{ data: [0, 0, 0, 0, 0] }]
          });
          return;
        }

        // Armazenar número de avaliações
        setAvaliacoesCount(medidasHistorico?.length || 0);

        if (medidasHistorico && medidasHistorico.length > 0) {
          const labels = medidasHistorico.map(medida => {
            const data = new Date(medida.data_medicao);
            return data.toLocaleDateString('pt-BR', { month: 'short' });
          });
          const data = medidasHistorico.map(medida => medida.peso);

          setWeightChartData({
            labels,
            datasets: [{ data }]
          });
        }
      } catch (error) {
        // Evitar que erros sejam exibidos no console do usuário
        console.log('Aviso: Não foi possível carregar todos os dados do perfil');
      }
    }

    fetchUserData();
  }, [user]);

  const chartConfig = {
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(236, 72, 153, ${opacity})`,
    labelColor: () => colors.textSecondary,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: Platform.select({ web: '0', default: '6' }), // Disable dots on web
      strokeWidth: '2',
      stroke: '#EC4899',
      fill: 'white',
    },
    useShadowColorFromDataset: false,
    withHorizontalLines: true,
    withVerticalLines: false,
    withDots: Platform.OS !== 'web', // Disable dots on web
    withShadow: false,
    withScrollableDot: false,
    withInnerLines: false,
    yAxisMinValue: 30,
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Welcome Section */}
      <View style={styles.header}>
        <Image
          source={userData?.foto || DEFAULT_PROFILE_IMAGE}
          style={styles.profileImage}
        />
        <View style={{ marginLeft: 16, flex: 1 }}>
          <Text style={[styles.welcomeText, { color: colors.text }]}> 
            Olá, {formatDisplayName(userData?.nome)}! 👋
          </Text>
          <Text style={[styles.motivationalText, { color: colors.textSecondary }]}> 
            {motivationalMessage}
          </Text>
        </View>
      </View>

      {/* Weekly Workout Frequency */}
      <WeeklyWorkoutCard />

      {/* Cycle Progress Card */}
      <CycleProgressCard />

      {/* Progress Section */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Seu Progresso</Text>
          <TouchableOpacity style={styles.periodSelector}>
            <Text style={[styles.periodText, { color: colors.primary }]}>Últimos 5 meses</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Scale size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {evolucaoData?.peso_atual ? evolucaoData.peso_atual.toFixed(1) : '0'} kg
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Peso Atual</Text>
          </View>
          
          <View style={styles.statItem}>
            <TrendingUp size={20} color="#10B981" />
            <Text style={[styles.statValue, { color: '#10B981' }]}>
              {evolucaoData?.diferenca_peso ? evolucaoData.diferenca_peso.toFixed(1) : '0'} kg
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Perda Total</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ruler size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {evolucaoData?.cintura_atual || '0'} cm
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Cintura</Text>
          </View>
        </View>

        <View style={styles.chartContainer}>
          <View style={{ position: 'relative' }}>
            <LineChart
              data={weightChartData}
              width={Platform.OS === 'web' ? Dimensions.get('window').width - 80 : Dimensions.get('window').width - 40}
              height={220}
              chartConfig={chartConfig}
              bezier
              fromZero={false}
              style={{
                ...styles.chart,
                ...(Platform.OS === 'web' ? { pointerEvents: 'none', touchAction: 'none' } : {}),
                ...(avaliacoesCount <= 1 ? { opacity: 0.5 } : {})
              }}
            />
            
            {avaliacoesCount <= 1 && (
              <View style={styles.chartOverlay}>
                <View style={styles.alertContainer}>
                  <Text style={styles.alertTitle}>Dados insuficientes</Text>
                  <Text style={styles.alertText}>
                    Você precisa de pelo menos 2 avaliações para visualizar seu progresso no gráfico.
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    gap: 10,
  },
  welcomeText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 14,
    marginBottom: 4,
  },
  motivationalText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
  },
  profileImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#EC4899',
    backgroundColor: '#fff',
    resizeMode: 'cover',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
  },
  workoutCard: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
  },
  workoutImage: {
    width: 100,
    height: 100,
  },
  workoutInfo: {
    flex: 1,
    padding: 12,
  },
  workoutTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    marginBottom: 4,
  },
  workoutTime: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    marginBottom: 12,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  startButtonText: {
    fontFamily: 'Poppins-Medium',
    color: 'white',
    marginLeft: 8,
  },
  periodSelector: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  periodText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
  },
  chartContainer: {
    alignItems: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  actionButton: {
    width: Platform.OS === 'web' ? 180 : '30%',
    aspectRatio: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    marginTop: 12,
  },
  bottomPadding: {
    height: 100,
  },
  chartOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  alertContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 16,
    borderRadius: 12,
    width: '80%',
    alignItems: 'center',
  },
  alertTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
    color: 'white',
    marginBottom: 8,
  },
  alertText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: 'white',
    textAlign: 'center',
  },
});
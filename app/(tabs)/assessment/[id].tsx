import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Dimensions, ActivityIndicator, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/context/ThemeContext';
import { useLocalSearchParams, router } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { ChevronLeft, Calendar, Download, Filter, Plus, AlertCircle, Edit } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Interface para as medidas corporais
interface MedidasCorporais {
  id: string;
  aluna_id: string | null;
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
  imagem_frente_url: string | null;
  imagem_lado_url: string | null;
  imagem_costas_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// Interface para o aluno com suas medidas
interface Aluno {
  user_id: string;
  nome: string;
  foto: string;
}

// Interface para o histórico de medidas formatado para os gráficos
interface HistoricoMedidas {
  peso: {
    labels: string[];
    data: number[];
  };
  medidas: {
    torax: number[];
    cintura: number[];
    abdomen: number[];
    quadril: number[];
    coxa_medial: number[];
    panturrilha: number[];
  };
}

const PERIODS = ['1M', '3M', '6M', '1A'];

export default function AssessmentDetailScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams();
  const [selectedPeriod, setSelectedPeriod] = useState('3M');
  const { width } = Dimensions.get('window');
  
  // Estados para armazenar os dados da aluna e suas medidas
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [medicaoAtual, setMedicaoAtual] = useState<MedidasCorporais | null>(null);
  const [historicoMedidas, setHistoricoMedidas] = useState<HistoricoMedidas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      r: Platform.select({ web: '0', default: '6' }),
      strokeWidth: '2',
      stroke: '#EC4899',
      fill: 'white',
    },
    useShadowColorFromDataset: false,
    withHorizontalLines: true,
    withVerticalLines: false,
    withDots: Platform.OS !== 'web',
    withShadow: false,
    withScrollableDot: false,
    withInnerLines: false,
  };

  // Função para buscar os dados da aluna
  async function fetchAlunoData() {
    try {
      setLoading(true);
      setError(null);
      
      // Buscar dados da aluna
      const { data: alunoData, error: alunoError } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', id)
        .single();
      
      if (alunoError) throw alunoError;
      
      if (alunoData) {
        setAluno({
          user_id: alunoData.user_id,
          nome: alunoData.nome || '',
          foto: alunoData.foto || 'https://via.placeholder.com/200'
        });
        
        // Buscar a medição mais recente
        const { data: medicaoData, error: medicaoError } = await supabase
          .from('medidas_corporais')
          .select('*')
          .eq('aluna_id', id)
          .order('data_medicao', { ascending: false })
          .limit(1)
          .single();
        
        if (medicaoError && medicaoError.code !== 'PGRST116') throw medicaoError;
        
        if (medicaoData) {
          setMedicaoAtual(medicaoData);
          
          // Buscar histórico de medições baseado no período selecionado
          await fetchHistoricoMedidas(id as string, selectedPeriod);
        }
      }
    } catch (error: any) {
      console.error('Erro ao buscar dados da aluna:', error.message);
      setError('Não foi possível carregar os dados. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  }
  
  // Função para buscar o histórico de medições
  async function fetchHistoricoMedidas(alunaId: string, periodo: string) {
    try {
      // Determinar a quantidade de meses para buscar baseado no período
      let meses = 1;
      switch (periodo) {
        case '3M': meses = 3; break;
        case '6M': meses = 6; break;
        case '1A': meses = 12; break;
        default: meses = 1;
      }
      
      // Calcular a data limite
      const dataLimite = new Date();
      dataLimite.setMonth(dataLimite.getMonth() - meses);
      
      // Buscar medições no período
      const { data: medicoesData, error: medicoesError } = await supabase
        .from('medidas_corporais')
        .select('*')
        .eq('aluna_id', alunaId)
        .gte('data_medicao', dataLimite.toISOString().split('T')[0])
        .order('data_medicao', { ascending: true });
      
      if (medicoesError) throw medicoesError;
      
      if (medicoesData && medicoesData.length > 0) {
        // Formatar dados para os gráficos
        const labels = medicoesData.map(m => {
          const date = new Date(m.data_medicao);
          return format(date, 'MMM', { locale: ptBR });
        });
        
        const pesoData = medicoesData.map(m => m.peso || 0);
        
        const toraxData = medicoesData.map(m => m.torax || 0);
        const cinturaData = medicoesData.map(m => m.cintura || 0);
        const abdomenData = medicoesData.map(m => m.abdomen || 0);
        const quadrilData = medicoesData.map(m => m.quadril || 0);
        const coxaMedialData = medicoesData.map(m => m.coxa_medial || 0);
        const panturrilhaData = medicoesData.map(m => m.panturrilha || 0);
        
        setHistoricoMedidas({
          peso: {
            labels,
            data: pesoData
          },
          medidas: {
            torax: toraxData,
            cintura: cinturaData,
            abdomen: abdomenData,
            quadril: quadrilData,
            coxa_medial: coxaMedialData,
            panturrilha: panturrilhaData
          }
        });
      }
    } catch (error: any) {
      console.error('Erro ao buscar histórico de medições:', error.message);
    }
  }
  
  // Efeito para carregar os dados quando o componente montar ou o período mudar
  useEffect(() => {
    if (id) {
      fetchAlunoData();
    }
  }, [id]);
  
  // Efeito para atualizar o histórico quando o período mudar
  useEffect(() => {
    if (id && aluno) {
      fetchHistoricoMedidas(id as string, selectedPeriod);
    }
  }, [selectedPeriod]);
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingObservation, setEditingObservation] = useState(false);
  const [observationText, setObservationText] = useState('');

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('admin')
          .eq('user_id', user.id)
          .single();
        setIsAdmin(userData?.admin || false);
      }
    } catch (error) {
      console.error('Erro ao verificar status de admin:', error);
    }
  };

  const handleUpdateObservation = async () => {
    try {
      const { error } = await supabase
        .from('medidas_corporais')
        .update({ obs_profissional: observationText })
        .eq('id', medicaoAtual?.id);

      if (error) throw error;

      setMedicaoAtual(prev => prev ? {...prev, obs_profissional: observationText} : null);
      setEditingObservation(false);
    } catch (error) {
      console.error('Erro ao atualizar observação:', error);
    }
  };

  const handleExport = () => {
    // Implement export functionality
  };

  const handleAddMeasurement = () => {
    // Implement add measurement functionality
  };
  
  // Formatar a data de medição
  const formatarData = (dataString: string | null) => {
    if (!dataString) return '';
    return format(new Date(dataString), 'dd/MM/yyyy');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Carregando dados...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <AlertCircle size={40} color="#EF4444" />
          <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Image
            source={aluno?.foto}
            style={styles.profileImage}
          />
          <Text style={[styles.profileName, { color: colors.text }]}>{aluno?.nome}</Text>
          {medicaoAtual && (
            <View style={styles.dateContainer}>
              <Calendar size={16} color={colors.primary} />
              <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                {formatarData(medicaoAtual.data_medicao)}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.periodContainer]}>
          {PERIODS.map((period) => (
            <TouchableOpacity
              key={period}
              style={[styles.periodButton, { backgroundColor: selectedPeriod === period ? colors.primary : colors.card }]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[styles.periodButtonText, { color: selectedPeriod === period ? 'white' : colors.text }]}>{period}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {medicaoAtual && (
          <View style={[styles.measurementCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Medidas Atuais</Text>
            
            <View style={styles.measurementSection}>
              <View style={styles.measurementGrid}>
                <View style={styles.measurementItem}>
                  <Text style={[styles.measurementLabel, { color: colors.textSecondary }]}>Peso</Text>
                  <Text style={[styles.measurementValue, { color: colors.text }]}>{medicaoAtual.peso} kg</Text>
                </View>

                <View style={styles.measurementItem}>
                  <Text style={[styles.measurementLabel, { color: colors.textSecondary }]}>Tórax</Text>
                  <Text style={[styles.measurementValue, { color: colors.text }]}>{medicaoAtual.torax} cm</Text>
                </View>

                <View style={styles.measurementItem}>
                  <Text style={[styles.measurementLabel, { color: colors.textSecondary }]}>Cintura</Text>
                  <Text style={[styles.measurementValue, { color: colors.text }]}>{medicaoAtual.cintura} cm</Text>
                </View>

                <View style={styles.measurementItem}>
                  <Text style={[styles.measurementLabel, { color: colors.textSecondary }]}>Abdômen</Text>
                  <Text style={[styles.measurementValue, { color: colors.text }]}>{medicaoAtual.abdomen} cm</Text>
                </View>

                <View style={styles.measurementItem}>
                  <Text style={[styles.measurementLabel, { color: colors.textSecondary }]}>Quadril</Text>
                  <Text style={[styles.measurementValue, { color: colors.text }]}>{medicaoAtual.quadril} cm</Text>
                </View>

                <View style={styles.measurementItem}>
                  <Text style={[styles.measurementLabel, { color: colors.textSecondary }]}>Coxa Medial</Text>
                  <Text style={[styles.measurementValue, { color: colors.text }]}>{medicaoAtual.coxa_medial} cm</Text>
                </View>

                <View style={styles.measurementItem}>
                  <Text style={[styles.measurementLabel, { color: colors.textSecondary }]}>Panturrilha</Text>
                  <Text style={[styles.measurementValue, { color: colors.text }]}>{medicaoAtual.panturrilha} cm</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {historicoMedidas && (
          <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Evolução do Peso</Text>
            <View style={styles.chartWrapper}>
              <LineChart
                data={{
                  labels: historicoMedidas.peso.labels,
                  datasets: [{ data: historicoMedidas.peso.data }]
                }}
                width={Platform.OS === 'web' ? Math.min(600, width - 40) : width - 40}
                height={220}
                chartConfig={{
                  ...chartConfig,
                  propsForBackgroundLines: {
                    strokeDasharray: '',
                    stroke: colors.border,
                    strokeWidth: 1
                  }
                }}
                bezier
                style={styles.chart}
                withInnerLines={false}
                withOuterLines
                withVerticalLabels
                withHorizontalLabels
                fromZero={false}

              />
            </View>
          </View>
        )}

        {historicoMedidas && (
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Evolução das Medidas</Text>
            
            <View style={styles.measurementCardsGrid}>
              {/* Card para Cintura */}
              <View style={[styles.measurementChartCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.measurementChartTitle, { color: colors.text }]}>Cintura</Text>
                <View style={styles.measurementDataContainer}>
                  <Text style={[styles.measurementValue, { color: colors.text, fontSize: 24, textAlign: 'center', marginVertical: 8 }]}>
                    {historicoMedidas.medidas.cintura[historicoMedidas.medidas.cintura.length - 1].toFixed(1)} cm
                  </Text>
                  {historicoMedidas.medidas.cintura.length > 1 && (
                    <View style={styles.progressIndicator}>
                      {historicoMedidas.medidas.cintura[historicoMedidas.medidas.cintura.length - 1] < 
                       historicoMedidas.medidas.cintura[historicoMedidas.medidas.cintura.length - 2] ? (
                        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
                          <View style={{width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid', borderLeftWidth: 6, borderRightWidth: 6, borderBottomWidth: 12, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#10B981', transform: [{rotate: '180deg'}]}} />
                          <Text style={{color: '#10B981', marginLeft: 4, fontSize: 14}}>
                            -{(historicoMedidas.medidas.cintura[historicoMedidas.medidas.cintura.length - 2] - 
                              historicoMedidas.medidas.cintura[historicoMedidas.medidas.cintura.length - 1]).toFixed(1)} cm
                          </Text>
                        </View>
                      ) : (
                        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
                          <View style={{width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid', borderLeftWidth: 6, borderRightWidth: 6, borderBottomWidth: 12, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#EF4444'}} />
                          <Text style={{color: '#EF4444', marginLeft: 4, fontSize: 14}}>
                            +{(historicoMedidas.medidas.cintura[historicoMedidas.medidas.cintura.length - 1] - 
                              historicoMedidas.medidas.cintura[historicoMedidas.medidas.cintura.length - 2]).toFixed(1)} cm
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>
              
              {/* Card para Quadril */}
              <View style={[styles.measurementChartCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.measurementChartTitle, { color: colors.text }]}>Quadril</Text>
                <View style={styles.measurementDataContainer}>
                  <Text style={[styles.measurementValue, { color: colors.text, fontSize: 24, textAlign: 'center', marginVertical: 8 }]}>
                    {historicoMedidas.medidas.quadril[historicoMedidas.medidas.quadril.length - 1].toFixed(1)} cm
                  </Text>
                  {historicoMedidas.medidas.quadril.length > 1 && (
                    <View style={styles.progressIndicator}>
                      {historicoMedidas.medidas.quadril[historicoMedidas.medidas.quadril.length - 1] < 
                       historicoMedidas.medidas.quadril[historicoMedidas.medidas.quadril.length - 2] ? (
                        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
                          <View style={{width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid', borderLeftWidth: 6, borderRightWidth: 6, borderBottomWidth: 12, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#10B981', transform: [{rotate: '180deg'}]}} />
                          <Text style={{color: '#10B981', marginLeft: 4, fontSize: 14}}>
                            -{(historicoMedidas.medidas.quadril[historicoMedidas.medidas.quadril.length - 2] - 
                              historicoMedidas.medidas.quadril[historicoMedidas.medidas.quadril.length - 1]).toFixed(1)} cm
                          </Text>
                        </View>
                      ) : (
                        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
                          <View style={{width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid', borderLeftWidth: 6, borderRightWidth: 6, borderBottomWidth: 12, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#EF4444'}} />
                          <Text style={{color: '#EF4444', marginLeft: 4, fontSize: 14}}>
                            +{(historicoMedidas.medidas.quadril[historicoMedidas.medidas.quadril.length - 1] - 
                              historicoMedidas.medidas.quadril[historicoMedidas.medidas.quadril.length - 2]).toFixed(1)} cm
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>
              
              {/* Card para Abdômen */}
              <View style={[styles.measurementChartCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.measurementChartTitle, { color: colors.text }]}>Abdômen</Text>
                <View style={styles.measurementDataContainer}>
                  <Text style={[styles.measurementValue, { color: colors.text, fontSize: 24, textAlign: 'center', marginVertical: 8 }]}>
                    {historicoMedidas.medidas.abdomen[historicoMedidas.medidas.abdomen.length - 1].toFixed(1)} cm
                  </Text>
                  {historicoMedidas.medidas.abdomen.length > 1 && (
                    <View style={styles.progressIndicator}>
                      {historicoMedidas.medidas.abdomen[historicoMedidas.medidas.abdomen.length - 1] < 
                       historicoMedidas.medidas.abdomen[historicoMedidas.medidas.abdomen.length - 2] ? (
                        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
                          <View style={{width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid', borderLeftWidth: 6, borderRightWidth: 6, borderBottomWidth: 12, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#10B981', transform: [{rotate: '180deg'}]}} />
                          <Text style={{color: '#10B981', marginLeft: 4, fontSize: 14}}>
                            -{(historicoMedidas.medidas.abdomen[historicoMedidas.medidas.abdomen.length - 2] - 
                              historicoMedidas.medidas.abdomen[historicoMedidas.medidas.abdomen.length - 1]).toFixed(1)} cm
                          </Text>
                        </View>
                      ) : (
                        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
                          <View style={{width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid', borderLeftWidth: 6, borderRightWidth: 6, borderBottomWidth: 12, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#EF4444'}} />
                          <Text style={{color: '#EF4444', marginLeft: 4, fontSize: 14}}>
                            +{(historicoMedidas.medidas.abdomen[historicoMedidas.medidas.abdomen.length - 1] - 
                              historicoMedidas.medidas.abdomen[historicoMedidas.medidas.abdomen.length - 2]).toFixed(1)} cm
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>
              
              {/* Card para Coxa Medial */}
              <View style={[styles.measurementChartCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.measurementChartTitle, { color: colors.text }]}>Coxa</Text>
                <View style={styles.measurementDataContainer}>
                  <Text style={[styles.measurementValue, { color: colors.text, fontSize: 24, textAlign: 'center', marginVertical: 8 }]}>
                    {historicoMedidas.medidas.coxa_medial[historicoMedidas.medidas.coxa_medial.length - 1].toFixed(1)} cm
                  </Text>
                  {historicoMedidas.medidas.coxa_medial.length > 1 && (
                    <View style={styles.progressIndicator}>
                      {historicoMedidas.medidas.coxa_medial[historicoMedidas.medidas.coxa_medial.length - 1] > 
                       historicoMedidas.medidas.coxa_medial[historicoMedidas.medidas.coxa_medial.length - 2] ? (
                        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
                          <View style={{width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid', borderLeftWidth: 6, borderRightWidth: 6, borderBottomWidth: 12, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#EF4444'}} />
                          <Text style={{color: '#EF4444', marginLeft: 4, fontSize: 14}}>
                            +{(historicoMedidas.medidas.coxa_medial[historicoMedidas.medidas.coxa_medial.length - 1] - 
                              historicoMedidas.medidas.coxa_medial[historicoMedidas.medidas.coxa_medial.length - 2]).toFixed(1)} cm
                          </Text>
                        </View>
                      ) : (
                        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
                          <View style={{width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid', borderLeftWidth: 6, borderRightWidth: 6, borderBottomWidth: 12, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#10B981', transform: [{rotate: '180deg'}]}} />
                          <Text style={{color: '#10B981', marginLeft: 4, fontSize: 14}}>
                            -{(historicoMedidas.medidas.coxa_medial[historicoMedidas.medidas.coxa_medial.length - 2] - 
                              historicoMedidas.medidas.coxa_medial[historicoMedidas.medidas.coxa_medial.length - 1]).toFixed(1)} cm
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>
              
              {/* Card para Tórax */}
              <View style={[styles.measurementChartCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.measurementChartTitle, { color: colors.text }]}>Tórax</Text>
                <View style={styles.measurementDataContainer}>
                  <Text style={[styles.measurementValue, { color: colors.text, fontSize: 24, textAlign: 'center', marginVertical: 8 }]}>
                    {historicoMedidas.medidas.torax[historicoMedidas.medidas.torax.length - 1].toFixed(1)} cm
                  </Text>
                  {historicoMedidas.medidas.torax.length > 1 && (
                    <View style={styles.progressIndicator}>
                      {historicoMedidas.medidas.torax[historicoMedidas.medidas.torax.length - 1] < 
                       historicoMedidas.medidas.torax[historicoMedidas.medidas.torax.length - 2] ? (
                        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
                          <View style={{width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid', borderLeftWidth: 6, borderRightWidth: 6, borderBottomWidth: 12, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#10B981', transform: [{rotate: '180deg'}]}} />
                          <Text style={{color: '#10B981', marginLeft: 4, fontSize: 14}}>
                            -{(historicoMedidas.medidas.torax[historicoMedidas.medidas.torax.length - 2] - 
                              historicoMedidas.medidas.torax[historicoMedidas.medidas.torax.length - 1]).toFixed(1)} cm
                          </Text>
                        </View>
                      ) : (
                        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
                          <View style={{width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid', borderLeftWidth: 6, borderRightWidth: 6, borderBottomWidth: 12, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#EF4444'}} />
                          <Text style={{color: '#EF4444', marginLeft: 4, fontSize: 14}}>
                            +{(historicoMedidas.medidas.torax[historicoMedidas.medidas.torax.length - 1] - 
                              historicoMedidas.medidas.torax[historicoMedidas.medidas.torax.length - 2]).toFixed(1)} cm
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>
              
              {/* Card para Panturrilha */}
              <View style={[styles.measurementChartCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.measurementChartTitle, { color: colors.text }]}>Panturrilha</Text>
                <View style={styles.measurementDataContainer}>
                  <Text style={[styles.measurementValue, { color: colors.text, fontSize: 24, textAlign: 'center', marginVertical: 8 }]}>
                    {historicoMedidas.medidas.panturrilha[historicoMedidas.medidas.panturrilha.length - 1].toFixed(1)} cm
                  </Text>
                  {historicoMedidas.medidas.panturrilha.length > 1 && (
                    <View style={styles.progressIndicator}>
                      {historicoMedidas.medidas.panturrilha[historicoMedidas.medidas.panturrilha.length - 1] < 
                       historicoMedidas.medidas.panturrilha[historicoMedidas.medidas.panturrilha.length - 2] ? (
                        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
                          <View style={{width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid', borderLeftWidth: 6, borderRightWidth: 6, borderBottomWidth: 12, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#10B981', transform: [{rotate: '180deg'}]}} />
                          <Text style={{color: '#10B981', marginLeft: 4, fontSize: 14}}>
                            -{(historicoMedidas.medidas.panturrilha[historicoMedidas.medidas.panturrilha.length - 2] - 
                              historicoMedidas.medidas.panturrilha[historicoMedidas.medidas.panturrilha.length - 1]).toFixed(1)} cm
                          </Text>
                        </View>
                      ) : (
                        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
                          <View style={{width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid', borderLeftWidth: 6, borderRightWidth: 6, borderBottomWidth: 12, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#EF4444'}} />
                          <Text style={{color: '#EF4444', marginLeft: 4, fontSize: 14}}>
                            +{(historicoMedidas.medidas.panturrilha[historicoMedidas.medidas.panturrilha.length - 1] - 
                              historicoMedidas.medidas.panturrilha[historicoMedidas.medidas.panturrilha.length - 2]).toFixed(1)} cm
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>
        )}

        {medicaoAtual && (
          <View style={[styles.measurementCard, { backgroundColor: colors.card, borderRadius: 18, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 8, elevation: 6, marginTop: 24 }]}> 
            <Text style={[styles.cardTitle, { color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 12, letterSpacing: 0.2, textShadowColor: 'rgba(0,0,0,0.06)', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 2 }]}>Observações Profissionais</Text>
            {isAdmin ? (
              <View style={[styles.observationContainer, { gap: 0 }]}> 
                {editingObservation ? (
                  <View style={styles.editObservationContainer}>
                    <TextInput
                      style={[styles.observationInput, { backgroundColor: colors.background, color: colors.text, borderRadius: 12, minHeight: 80, padding: 12, fontSize: 15, borderWidth: 1, borderColor: colors.border, marginBottom: 12 }]}
                      value={observationText}
                      onChangeText={setObservationText}
                      multiline
                      placeholder="Digite suas observações profissionais..."
                      placeholderTextColor={colors.textSecondary}
                    />
                    <View style={[styles.editButtonsContainer, { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }]}> 
                      <TouchableOpacity
                        style={[styles.editButton, { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 18, paddingVertical: 8 }]}
                        onPress={handleUpdateObservation}
                      >
                        <Text style={[styles.editButtonText, { color: 'white', fontWeight: 'bold' }]}>Salvar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.editButton, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 18, paddingVertical: 8 }]}
                        onPress={() => {
                          setEditingObservation(false);
                          setObservationText(medicaoAtual.obs_profissional || '');
                        }}
                      >
                        <Text style={[styles.editButtonText, { color: colors.text, fontWeight: 'bold' }]}>Cancelar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.observationContent, { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }]}> 
                    <Text style={[styles.observationText, { color: colors.text, flex: 1, fontSize: 15, lineHeight: 22 }]}> 
                      {medicaoAtual.obs_profissional || 'Nenhuma observação profissional registrada.'}
                    </Text>
                    <TouchableOpacity
                      style={[styles.editObservationButton, { backgroundColor: colors.primary }]}
                      onPress={() => {
                        setObservationText(medicaoAtual.obs_profissional || '');
                        setEditingObservation(true);
                      }}
                    >
                      <Edit size={16} color="white" />
                      <Text style={[styles.editButtonText, { color: 'white', marginLeft: 8, fontWeight: 'bold' }]}>Editar</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              <Text style={[styles.observationText, { color: colors.text, fontSize: 15, lineHeight: 22 }]}> 
                {medicaoAtual.obs_profissional || 'Nenhuma observação profissional registrada.'}
              </Text>
            )}
          </View>
        )}
        {(medicaoAtual?.imagem_frente_url || medicaoAtual?.imagem_lado_url || medicaoAtual?.imagem_costas_url) && (
          <View style={[styles.imagesCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Fotos</Text>
            <View style={styles.imagesGrid}>
              {medicaoAtual?.imagem_frente_url && (
                <View style={styles.imageContainer}>
                  <Image source={medicaoAtual.imagem_frente_url} style={styles.progressImage} />
                  <Text style={[styles.imageLabel, { color: colors.textSecondary }]}>Frente</Text>
                </View>
              )}
              {medicaoAtual?.imagem_lado_url && (
                <View style={styles.imageContainer}>
                  <Image source={medicaoAtual.imagem_lado_url} style={styles.progressImage} />
                  <Text style={[styles.imageLabel, { color: colors.textSecondary }]}>Lado</Text>
                </View>
              )}
              {medicaoAtual?.imagem_costas_url && (
                <View style={styles.imageContainer}>
                  <Image source={medicaoAtual.imagem_costas_url} style={styles.progressImage} />
                  <Text style={[styles.imageLabel, { color: colors.textSecondary }]}>Costas</Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  observationContainer: {
    marginTop: 8,
  },
  observationContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  observationText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    flex: 1,
  },
  observationInput: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    padding: 12,
    borderRadius: 8,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  editObservationContainer: {
    gap: 12,
  },
  editButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
  },
  editObservationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
  container: {
    flex: 1,
  },
  legendContainer: {
    marginTop: 10,
    paddingHorizontal: 10,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 40,
    left: 20,
    zIndex: 10,
    padding: 8,
    borderRadius: 8,
  },
  header: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'web' ? 40 : 60,
    paddingHorizontal: 20,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
    marginBottom: 20,
    justifyContent: 'center',
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  measurementCard: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  measurementSection: {
    marginBottom: 16,
  },
  measurementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  measurementItem: {
    minWidth: Platform.OS === 'web' ? 120 : '45%',
  },
  measurementLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  measurementValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginVertical: 16,
  },
  chartCard: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
  },
  chartWrapper: {
    alignItems: 'center',
    marginTop: 8,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  notesCard: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bottomPadding: {
    height: 40,
  },
  periodContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
    marginTop: 16,
    justifyContent: 'space-between',
  },
  // Novos estilos para o grid de medidas
  sectionContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  measurementCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  measurementChartCard: {
    width: Platform.OS === 'web' ? 'calc(50% - 8px)' : '48%',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    maxWidth: '48%',
  },
  measurementChartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  smallChart: {
    borderRadius: 8,
    marginVertical: 4,
  },
  // Novos estilos para a exibição numérica das medidas
  measurementDataContainer: {
    paddingVertical: 5,
  },
  measurementDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  measurementDataLabel: {
    fontSize: 14,
    flex: 1,
  },
  measurementDataValue: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  measurementDataDiff: {
    fontSize: 12,
    flex: 1,
    textAlign: 'right',
  },
  imagesCard: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  imageContainer: {
    width: '30%',
    alignItems: 'center',
  },
  progressImage: {
    width: '100%',
    aspectRatio: 0.75,
    borderRadius: 8,
  },
  imageLabel: {
    marginTop: 8,
    fontSize: 14,
  }
});
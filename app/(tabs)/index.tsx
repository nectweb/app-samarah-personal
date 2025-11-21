import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Platform } from 'react-native';
import {
  Users,
  CreditCard,
  LogOut,
  Clock,
  Dumbbell,
  Sun,
  Moon,
  AlertCircle,
  Calendar,
  FileText,
} from 'lucide-react-native';
import { router } from 'expo-router';
import ClientProgressCard from '@/components/ClientProgressCard';
import { supabase } from '@/lib/supabase';
import { useEffect, useState, useCallback } from 'react';
import {
  format,
  isAfter,
  isBefore,
  addDays,
  parseISO,
  differenceInDays,
} from 'date-fns';
import { pt } from 'date-fns/locale';
import StatCard from '@/components/StatCard';

// Sample data for upcoming assessments
const UPCOMING_ASSESSMENTS = [
  {
    id: '1',
    date: '15/05/2025',
    time: '09:00',
    clientName: 'Ana Silva',
    type: 'Avaliação Física Completa',
    status: 'confirmada',
  },
  {
    id: '2',
    date: '16/05/2025',
    time: '10:30',
    clientName: 'Carla Mendes',
    type: 'Reavaliação Trimestral',
    status: 'pendente',
  },
  {
    id: '3',
    date: '17/05/2025',
    time: '14:00',
    clientName: 'Juliana Costa',
    type: 'Avaliação Postural',
    status: 'confirmada',
  },
];

// Interface para as fichas expirando
interface FichaExpirando {
  id: string;
  data_fim: string;
  diasRestantes: number;
  nome_aluna: string;
  nome_ficha: string;
}

// Interface para as próximas medições
interface ProximaMedicao {
  id: string;
  aluna_id: string;
  data_prox_medicao: string;
  diasRestantes: number;
  nome_aluna: string;
}

// Sample data for clients
const CLIENTS = [
  {
    id: '1',
    name: 'Ana Silva',
    progress: 85,
    image:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
    lastSession: '10/05/2025',
    nextSession: '15/05/2025',
  },
  {
    id: '2',
    name: 'Carla Mendes',
    progress: 65,
    image:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
    lastSession: '09/05/2025',
    nextSession: '16/05/2025',
  },
  {
    id: '3',
    name: 'Juliana Costa',
    progress: 92,
    image:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
    lastSession: '11/05/2025',
    nextSession: '14/05/2025',
  },
];

export default function TrainerDashboard() {
  const { colors, theme, toggleTheme } = useTheme();
  const { signOut } = useAuth();
  const [fichasExpirando, setFichasExpirando] = useState<FichaExpirando[]>([]);
  const [loadingFichas, setLoadingFichas] = useState(true);
  const [errorFichas, setErrorFichas] = useState<string | null>(null);

  // Estados para as próximas medições
  const [proximasMedicoes, setProximasMedicoes] = useState<ProximaMedicao[]>(
    []
  );
  const [loadingMedicoes, setLoadingMedicoes] = useState(true);
  const [errorMedicoes, setErrorMedicoes] = useState<string | null>(null);

  // Estado para o pull-to-refresh
  const [refreshing, setRefreshing] = useState(false);

  // Função para buscar fichas expirando em até 7 dias
  const fetchFichasExpirando = async () => {
    try {
      setLoadingFichas(true);
      setErrorFichas(null);

      // Buscar fichas com data_fim definida
      const { data, error } = await supabase
        .from('fichas_das_alunas')
        .select(
          `
          id,
          data_fim,
          id_aluna,
          id_fichas,
          users:id_aluna (nome),
          fichas:id_fichas (nome_ficha)
        `
        )
        .not('data_fim', 'is', null);

      if (error) {
        console.error('Erro ao buscar fichas expirando:', error);
        setErrorFichas('Não foi possível carregar as fichas expirando');
        return;
      }

      const hoje = new Date();
      const umaSemanaDepois = addDays(hoje, 7);

      // Filtrar apenas as fichas que expiram em até 7 dias a partir de hoje
      const fichasProximasExpirar = data
        .filter((ficha) => {
          if (!ficha.data_fim) return false;
          const dataFim = parseISO(ficha.data_fim);
          return isAfter(dataFim, hoje) && isBefore(dataFim, umaSemanaDepois);
        })
        .map((ficha) => {
          const dataFim = parseISO(ficha.data_fim);
          return {
            id: ficha.id,
            data_fim: ficha.data_fim,
            diasRestantes: differenceInDays(dataFim, hoje),
            nome_aluna: ficha.users
              ? (ficha.users as any).nome || 'Aluna sem nome'
              : 'Aluna sem nome',
            nome_ficha: ficha.fichas
              ? (ficha.fichas as any).nome_ficha || 'Ficha sem nome'
              : 'Ficha sem nome',
          };
        })
        .sort((a, b) => a.diasRestantes - b.diasRestantes); // Ordenar por dias restantes (crescente)

      setFichasExpirando(fichasProximasExpirar);
    } catch (err) {
      console.error('Erro ao processar fichas expirando:', err);
      setErrorFichas('Ocorreu um erro ao processar as fichas');
    } finally {
      setLoadingFichas(false);
    }
  };

  // Função para buscar próximas medições nos próximos 15 dias
  const fetchProximasMedicoes = async () => {
    try {
      setLoadingMedicoes(true);
      setErrorMedicoes(null);

      // Buscar medidas com data_prox_medicao definida
      const { data, error } = await supabase
        .from('medidas_corporais')
        .select(
          `
          id,
          aluna_id,
          data_prox_medicao,
          users:aluna_id (nome)
        `
        )
        .not('data_prox_medicao', 'is', null);

      if (error) {
        console.error('Erro ao buscar próximas medições:', error);
        setErrorMedicoes('Não foi possível carregar as próximas medições');
        return;
      }

      const hoje = new Date();
      const quinzeDiasDepois = addDays(hoje, 15);

      // Filtrar apenas as medições que estão agendadas para os próximos 15 dias
      const medicoesProximos15Dias = data
        .filter((medicao) => {
          if (!medicao.data_prox_medicao) return false;
          const dataProxMedicao = parseISO(medicao.data_prox_medicao);
          return (
            isAfter(dataProxMedicao, hoje) &&
            isBefore(dataProxMedicao, quinzeDiasDepois)
          );
        })
        .map((medicao) => {
          const dataProxMedicao = parseISO(medicao.data_prox_medicao);
          return {
            id: medicao.id,
            aluna_id: medicao.aluna_id,
            data_prox_medicao: medicao.data_prox_medicao,
            diasRestantes: differenceInDays(dataProxMedicao, hoje),
            nome_aluna: medicao.users
              ? (medicao.users as any).nome || 'Aluna sem nome'
              : 'Aluna sem nome',
          };
        })
        .sort((a, b) => a.diasRestantes - b.diasRestantes); // Ordenar por dias restantes (crescente)

      setProximasMedicoes(medicoesProximos15Dias);
    } catch (err) {
      console.error('Erro ao processar próximas medições:', err);
      setErrorMedicoes('Ocorreu um erro ao processar as próximas medições');
    } finally {
      setLoadingMedicoes(false);
    }
  };

  // Função para atualizar todos os dados do dashboard
  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    // Atualizar todos os dados em paralelo
    await Promise.all([
      fetchFichasExpirando(),
      fetchProximasMedicoes(),
    ]);

    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchFichasExpirando();
    fetchProximasMedicoes();
  }, []);

  // Formatação da data
  const formatarData = (dataString: string) => {
    try {
      const data = parseISO(dataString);
      return format(data, 'dd/MM/yyyy', { locale: pt });
    } catch (error) {
      return 'Data inválida';
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View>
            <Text style={[styles.welcomeText, { color: colors.text }]}>
              Olá, Samarah! 👋
            </Text>
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
              {new Date().toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: colors.card }]}
              onPress={toggleTheme}
            >
              {theme === 'dark' ? (
                <Sun size={20} color={colors.primary} />
              ) : (
                <Moon size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: colors.card }]}
              onPress={signOut}
            >
              <LogOut size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
        <Image
          source="https://images.unsplash.com/photo-1548690312-e3b507d8c110?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80"
          style={styles.profileImage}
        />
      </View>

      <View style={styles.quickLinksContainer}>
        <TouchableOpacity
          style={[styles.quickLinkCard, { backgroundColor: colors.card }]}
          onPress={() => router.push('/clients')}
        >
          <Users size={24} color={colors.primary} />
          <Text style={[styles.quickLinkText, { color: colors.text }]}>
            Alunas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickLinkCard, { backgroundColor: colors.card }]}
          onPress={() => router.push('/fichas')}
        >
          <FileText size={24} color={colors.primary} />
          <Text style={[styles.quickLinkText, { color: colors.text }]}>
            Fichas
          </Text>
        </TouchableOpacity>

        {/* Finanças button removed */}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Fichas Expirando
          </Text>
          <TouchableOpacity>
            <Text style={[styles.sectionAction, { color: colors.primary }]}>
              Ver Todos
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.listContainer}>
          {loadingFichas ? (
            <View
              style={[
                styles.loadingContainer,
                { backgroundColor: colors.card },
              ]}
            >
              <ActivityIndicator size="large" color={colors.primary} />
              <Text
                style={[styles.loadingText, { color: colors.textSecondary }]}
              >
                Carregando fichas expirando...
              </Text>
            </View>
          ) : errorFichas ? (
            <View
              style={[styles.errorContainer, { backgroundColor: colors.card }]}
            >
              <AlertCircle size={24} color="#EF4444" />
              <Text style={[styles.errorText, { color: colors.textSecondary }]}>
                {errorFichas}
              </Text>
            </View>
          ) : fichasExpirando.length === 0 ? (
            <View
              style={[styles.emptyContainer, { backgroundColor: colors.card }]}
            >
              <Calendar
                size={30}
                color={colors.primary}
                style={{ opacity: 0.7 }}
              />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Nenhuma ficha expirando em breve
              </Text>
              <Text
                style={[styles.emptySubtext, { color: colors.textSecondary }]}
              >
                Não há fichas de alunas expirando nos próximos 7 dias
              </Text>
            </View>
          ) : (
            fichasExpirando.map((ficha) => (
              <View
                key={ficha.id}
                style={[styles.listItem, { backgroundColor: colors.card }]}
              >
                <View style={styles.listItemLeft}>
                  <View style={styles.dateTimeContainer}>
                    <Calendar size={16} color={colors.primary} />
                    <Text style={[styles.dateTimeText, { color: colors.text }]}>
                      Expira em: {formatarData(ficha.data_fim)}
                    </Text>
                  </View>
                  <Text style={[styles.clientName, { color: colors.text }]}>
                    {ficha.nome_aluna}
                  </Text>
                  <View style={styles.trainingDetails}>
                    <View style={styles.trainingType}>
                      <Dumbbell size={16} color={colors.textSecondary} />
                      <Text
                        style={[
                          styles.itemType,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {ficha.nome_ficha}
                      </Text>
                    </View>
                  </View>
                </View>
                <View
                  style={[
                    styles.statusTag,
                    {
                      backgroundColor:
                        ficha.diasRestantes <= 3
                          ? 'rgba(239, 68, 68, 0.1)'
                          : 'rgba(236, 72, 153, 0.1)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color: ficha.diasRestantes <= 3 ? '#EF4444' : '#EC4899',
                      },
                    ]}
                  >
                    {ficha.diasRestantes}{' '}
                    {ficha.diasRestantes === 1 ? 'dia' : 'dias'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </View>

      {/* Nova seção para Próximas Medições */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Próximas Medições
          </Text>
          <TouchableOpacity>
            <Text style={[styles.sectionAction, { color: colors.primary }]}>
              Ver Todas
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.listContainer}>
          {loadingMedicoes ? (
            <View
              style={[
                styles.loadingContainer,
                { backgroundColor: colors.card },
              ]}
            >
              <ActivityIndicator size="large" color={colors.primary} />
              <Text
                style={[styles.loadingText, { color: colors.textSecondary }]}
              >
                Carregando próximas medições...
              </Text>
            </View>
          ) : errorMedicoes ? (
            <View
              style={[styles.errorContainer, { backgroundColor: colors.card }]}
            >
              <AlertCircle size={24} color="#EF4444" />
              <Text style={[styles.errorText, { color: colors.textSecondary }]}>
                {errorMedicoes}
              </Text>
            </View>
          ) : proximasMedicoes.length === 0 ? (
            <View
              style={[styles.emptyContainer, { backgroundColor: colors.card }]}
            >
              <Calendar
                size={30}
                color={colors.primary}
                style={{ opacity: 0.7 }}
              />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Nenhuma medição agendada em breve
              </Text>
              <Text
                style={[styles.emptySubtext, { color: colors.textSecondary }]}
              >
                Não há medições agendadas para os próximos 15 dias
              </Text>
            </View>
          ) : (
            proximasMedicoes.map((medicao) => (
              <View
                key={medicao.id}
                style={[styles.listItem, { backgroundColor: colors.card }]}
              >
                <View style={styles.listItemLeft}>
                  <View style={styles.dateTimeContainer}>
                    <Calendar size={16} color={colors.primary} />
                    <Text style={[styles.dateTimeText, { color: colors.text }]}>
                      Data: {formatarData(medicao.data_prox_medicao)}
                    </Text>
                  </View>
                  <Text style={[styles.clientName, { color: colors.text }]}>
                    {medicao.nome_aluna}
                  </Text>
                  <Text
                    style={[styles.itemType, { color: colors.textSecondary }]}
                  >
                    Avaliação física
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusTag,
                    {
                      backgroundColor:
                        medicao.diasRestantes <= 3
                          ? 'rgba(239, 68, 68, 0.1)'
                          : 'rgba(236, 72, 153, 0.1)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          medicao.diasRestantes <= 3 ? '#EF4444' : '#EC4899',
                      },
                    ]}
                  >
                    {medicao.diasRestantes}{' '}
                    {medicao.diasRestantes === 1 ? 'dia' : 'dias'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </View>

      <View style={styles.bottomPadding} />
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
  },
  quickLinksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  quickLinkCard: {
    flex: 1,
    marginHorizontal: 6,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  quickLinkText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    marginTop: 8,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginRight: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    marginBottom: 4,
  },
  dateText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  statsGrid: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  fullWidthCard: {
    width: '100%',
    padding: 20,
    marginBottom: 16,
  },
  statValue: {
    fontFamily: 'Poppins-Bold',
    fontSize: 32,
    marginTop: 8,
  },
  statLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
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
  sectionAction: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
  },
  listContainer: {
    marginTop: 8,
  },
  listItem: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemLeft: {
    flex: 1,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dateTimeText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    marginLeft: 8,
  },
  clientName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    marginBottom: 4,
  },
  itemType: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
  },
  statusTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
  },
  trainingDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trainingType: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  trainerName: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    marginLeft: 4,
  },
  clientsContainer: {
    paddingRight: 20,
  },
  bottomPadding: {
    height: 100,
  },
  loadingContainer: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  loadingText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    marginLeft: 8,
  },
  errorContainer: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  errorText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    marginLeft: 8,
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
  },
  emptyTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
});

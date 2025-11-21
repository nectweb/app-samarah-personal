import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import {
  Play,
  Clock,
  Dumbbell,
  History,
  ChevronRight,
  Calendar,
  CheckCircle,
  ArrowRight,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { pt } from 'date-fns/locale';

// Interface para os treinos associados às fichas
interface Treino {
  id: string;
  nome: string;
  descricao: string | null;
  nivel: string | null;
  objetivo: string | null;
  duracao_treino: string | null;
  modalidade: string | null;
}

// Interface para as fichas da aluna
interface FichaAluna {
  id: string;
  id_aluna: string;
  id_fichas: number;
  data_inicio: string;
  data_fim: string | null;
  fichas: {
    id: number;
    nome_ficha: string;
    descricao: string | null;
    treinos_count?: number;
  };
  treinos?: Treino[];
}

export default function WorkoutsScreen() {
  const { colors } = useTheme();
  const [fichasAluna, setFichasAluna] = useState<FichaAluna[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFichasAluna();
  }, []);

  // Função para buscar as fichas da aluna logada
  const fetchFichasAluna = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obter o usuário atual
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const userId = user.id;
      console.log('Iniciando busca de fichas para usuário:', userId);

      // Primeiro, vamos verificar se existem registros na tabela fichas_das_alunas
      const { data: alunaCheck, error: alunaError } = await supabase
        .from('fichas_das_alunas')
        .select('*')
        .eq('id_aluna', userId)
        .limit(1);

      if (alunaError) {
        console.error('Erro ao verificar fichas existentes:', alunaError);
        if (
          alunaError.code === '42501' ||
          alunaError.message?.includes('security')
        ) {
          setError(
            'Aguardando permissão para acessar suas fichas. Entre em contato com seu treinador.'
          );
          return;
        } else {
          throw alunaError;
        }
      }

      // Se não existir nenhum registro para o usuário, vamos criar um
      if (!alunaCheck || alunaCheck.length === 0) {
        console.log(
          'Nenhum registro encontrado para o usuário. Criando vínculo inicial...'
        );

        // Primeiro verificar se existem fichas disponíveis
        const { data: fichasDisponiveis, error: fichasError } = await supabase
          .from('fichas')
          .select('id')
          .limit(1);

        if (fichasError) {
          console.error('Erro ao verificar fichas disponíveis:', fichasError);
          if (
            fichasError.code === '42501' ||
            fichasError.message?.includes('security')
          ) {
            setError(
              'Aguardando configuração das suas fichas de treino pela sua treinadora.'
            );
            return;
          }
          throw fichasError;
        }

        if (!fichasDisponiveis || fichasDisponiveis.length === 0) {
          setError(
            'Ainda não há fichas de treino disponíveis. Sua treinadora adicionará em breve.'
          );
          return;
        }

        const primeiraFichaId = fichasDisponiveis[0].id;

        // Criar o vínculo
        const { data: newVinculo, error: vinculoError } = await supabase
          .from('fichas_das_alunas')
          .insert([
            {
              id_aluna: userId,
              id_fichas: primeiraFichaId,
              data_inicio: new Date().toISOString(),
            },
          ])
          .select();

        if (vinculoError) {
          console.error('Erro ao criar vínculo:', JSON.stringify(vinculoError, null, 2));
          if (
            vinculoError.code === '42501' ||
            vinculoError.code === '23505' || // duplicate key
            vinculoError.message?.includes('security') ||
            vinculoError.message?.includes('violates row-level') ||
            vinculoError.message?.includes('duplicate')
          ) {
            setError(
              vinculoError.code === '23505' 
                ? 'Você já tem uma ficha de treino ativa.'
                : 'Sua treinadora ainda precisa configurar suas permissões. Por favor, aguarde.'
            );
            return;
          }
          throw vinculoError;
        }

        console.log('Vínculo criado com sucesso:', newVinculo);
      }

      // Busca principal com join simplificado
      const { data, error } = await supabase
        .from('fichas_das_alunas')
        .select(
          `
          *,
          fichas (*)
        `
        )
        .eq('id_aluna', userId);

      console.log('Resultado da busca principal:', { data, error });

      if (error) {
        console.error('Erro na consulta principal:', error);
        if (
          error.code === '42501' ||
          error.message?.includes('security') ||
          error.message?.includes('violates row-level')
        ) {
          setError(
            'Aguardando configuração das suas fichas de treino. Por favor, aguarde um momento.'
          );
          return;
        }
        throw error;
      }

      if (!data || data.length === 0) {
        setError(
          'Sua ficha de treino ainda não foi configurada. Fale com sua treinadora para começar seus treinos.'
        );
        setFichasAluna([]);
        return;
      }

      // Buscar a contagem de treinos para cada ficha
      const formattedData: FichaAluna[] = await Promise.all(
        (data || []).map(async (item: any) => {
          // Contar treinos associados a esta ficha
          const { count: treinosCount, error: countError } = await supabase
            .from('fichas_treino')
            .select('id', { count: 'exact' })
            .eq('fichas_id', item.id_fichas);

          if (countError) {
            console.error(
              `Erro ao contar treinos para ficha ${item.id_fichas}:`,
              countError
            );
          }

          return {
            id: item.id || '',
            id_aluna: item.id_aluna || '',
            id_fichas: item.id_fichas || 0,
            data_inicio: item.data_inicio || new Date().toISOString(),
            data_fim: item.data_fim,
            fichas: {
              id: item.fichas?.id || 0,
              nome_ficha: item.fichas?.nome_ficha || 'Ficha sem nome',
              descricao: item.fichas?.descricao || null,
              treinos_count: treinosCount || 0,
            },
          };
        })
      );

      console.log('Dados formatados finais:', formattedData);
      setFichasAluna(formattedData);
    } catch (err: any) {
      console.error('Erro detalhado:', err);
      // Transformar o erro técnico em uma mensagem amigável
      let mensagemAmigavel =
        'Não foi possível carregar seus treinos no momento.';

      if (
        err.message?.includes('permission') ||
        err.message?.includes('security') ||
        err.message?.includes('violates row-level')
      ) {
        mensagemAmigavel =
          'Aguardando a treinadora adicionar suas fichas de treino. Por favor, tente novamente mais tarde.';
      } else if (err.message?.includes('network')) {
        mensagemAmigavel =
          'Verifique sua conexão com a internet e tente novamente.';
      }

      setError(mensagemAmigavel);
    } finally {
      setLoading(false);
    }
  };

  // Função para formatar data
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: pt });
    } catch (e) {
      return 'Data inválida';
    }
  };

  // Verificar status da ficha
  const getFichaStatus = (dataInicio: string, dataFim: string | null) => {
    const hoje = new Date();
    const inicio = new Date(dataInicio);

    if (!dataFim) {
      // Se não houver data de fim, consideramos ativa se já passou da data de início
      return isAfter(hoje, inicio) ? 'ativa' : 'futura';
    }

    const fim = new Date(dataFim);

    if (isBefore(hoje, inicio)) {
      return 'futura';
    } else if (isAfter(hoje, fim)) {
      return 'concluída';
    } else {
      return 'ativa';
    }
  };

  // Definir cores com base no status
  const getStatusColors = (
    dataInicio: string,
    dataFim: string | null
  ): {
    gradient: [string, string];
    label: string;
    bg: string;
    text: string;
  } => {
    const status = getFichaStatus(dataInicio, dataFim);

    switch (status) {
      case 'ativa':
        return {
          gradient: ['#EC4899', '#D946EF'] as [string, string],
          label: 'Ficha Ativa',
          bg: 'rgba(236, 72, 153, 0.1)',
          text: '#EC4899',
        };
      case 'futura':
        return {
          gradient: ['#3B82F6', '#60A5FA'] as [string, string],
          label: 'Ficha Futura',
          bg: 'rgba(59, 130, 246, 0.1)',
          text: '#3B82F6',
        };
      case 'concluída':
        return {
          gradient: ['#10B981', '#34D399'] as [string, string],
          label: 'Ficha Concluída',
          bg: 'rgba(16, 185, 129, 0.1)',
          text: '#10B981',
        };
      default:
        return {
          gradient: ['#6B7280', '#9CA3AF'] as [string, string],
          label: 'Status Desconhecido',
          bg: 'rgba(107, 114, 128, 0.1)',
          text: '#6B7280',
        };
    }
  };

  // Calcular dias restantes
  const getDiasRestantes = (dataFim: string | null) => {
    if (!dataFim) return null;

    const hoje = new Date();
    const fim = new Date(dataFim);

    if (isBefore(fim, hoje)) return 'Expirado';

    const diffTime = Math.abs(fim.getTime() - hoje.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return `${diffDays} dias restantes`;
  };

  // Calcular progresso
  const calcularProgresso = (dataInicio: string, dataFim: string | null) => {
    if (!dataFim) return 0;

    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    const hoje = new Date();

    if (isBefore(hoje, inicio)) return 0;
    if (isAfter(hoje, fim)) return 100;

    const duracaoTotal = fim.getTime() - inicio.getTime();
    const progresso = hoje.getTime() - inicio.getTime();

    return Math.round((progresso / duracaoTotal) * 100);
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Carregando seus treinos...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, paddingTop: 60 },
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Meus Treinos
          </Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View
            style={[
              styles.errorContainer,
              { backgroundColor: colors.card, marginHorizontal: 20 },
            ]}
          >
            <View
              style={[
                styles.errorIconContainer,
                {
                  backgroundColor: 'rgba(236, 72, 153, 0.1)',
                  borderRadius: 50,
                  width: 80,
                  height: 80,
                  justifyContent: 'center',
                  alignItems: 'center',
                },
              ]}
            >
              <Dumbbell size={40} color="#EC4899" style={{ opacity: 0.9 }} />
            </View>
            <Text style={[styles.errorTitle, { color: colors.text }]}>
              Ops! Ainda não temos fichas para você
            </Text>
            <Text
              style={[
                styles.errorMessage,
                { color: colors.textSecondary, marginBottom: 20 },
              ]}
            >
              No momento não encontramos nenhuma ficha de treino vinculada à sua
              conta. Sua treinadora adicionará seus treinos em breve.
            </Text>
            <TouchableOpacity
              style={[
                styles.errorButton,
                {
                  backgroundColor: '#EC4899',
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  elevation: 2,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 3,
                },
              ]}
              onPress={() => fetchFichasAluna()}
            >
              <Text style={styles.errorButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Meus Treinos</Text>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => console.log('Histórico de treinos')}
        >
          <History size={20} color={colors.primary} />
          <Text style={[styles.historyText, { color: colors.primary }]}>
            Histórico
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {fichasAluna.length === 0 ? (
          <View
            style={[styles.emptyContainer, { backgroundColor: colors.card }]}
          >
            <Dumbbell
              size={60}
              color={colors.textSecondary}
              style={{ opacity: 0.5 }}
            />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Você ainda não possui treinos atribuídos
            </Text>
            <Text
              style={[styles.emptySubText, { color: colors.textSecondary }]}
            >
              Quando seu treinador atribuir uma ficha, ela aparecerá aqui
            </Text>
          </View>
        ) : (
          fichasAluna.map((ficha) => {
            const statusInfo = getStatusColors(
              ficha.data_inicio,
              ficha.data_fim
            );
            const progresso = calcularProgresso(
              ficha.data_inicio,
              ficha.data_fim
            );
            const diasRestantes = getDiasRestantes(ficha.data_fim);

            return (
              <View key={ficha.id} style={styles.workoutCard}>
                <LinearGradient
                  colors={statusInfo.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.cardHeader}
                >
                  <Text style={styles.cardTitle}>
                    {ficha.fichas.nome_ficha}
                  </Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{statusInfo.label}</Text>
                  </View>
                </LinearGradient>

                <View
                  style={[styles.cardBody, { backgroundColor: colors.card }]}
                >
                  <Text
                    style={[
                      styles.cardDescription,
                      { color: colors.textSecondary },
                    ]}
                    numberOfLines={2}
                  >
                    {ficha.fichas.descricao ||
                      'essa ficha e para fins de teste'}
                  </Text>

                  <View style={styles.dateContainer}>
                    <View style={styles.dateItem}>
                      <Calendar size={16} color={statusInfo.text} />
                      <Text
                        style={[
                          styles.dateLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Início:
                      </Text>
                      <Text style={[styles.dateValue, { color: colors.text }]}>
                        {formatDate(ficha.data_inicio)}
                      </Text>
                    </View>

                    {ficha.data_fim && (
                      <View style={styles.dateItem}>
                        <Calendar size={16} color={statusInfo.text} />
                        <Text
                          style={[
                            styles.dateLabel,
                            { color: colors.textSecondary },
                          ]}
                        >
                          Fim:
                        </Text>
                        <Text
                          style={[styles.dateValue, { color: colors.text }]}
                        >
                          {formatDate(ficha.data_fim)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {ficha.data_fim && (
                    <View style={styles.progressContainer}>
                      <View
                        style={[
                          styles.progressBar,
                          { backgroundColor: 'rgba(0,0,0,0.05)' },
                        ]}
                      >
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${progresso}%`,
                              backgroundColor: statusInfo.text,
                            },
                          ]}
                        />
                      </View>
                      <View style={styles.progressInfo}>
                        <Text
                          style={[
                            styles.progressText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {progresso}% Completo
                        </Text>
                        {diasRestantes && (
                          <Text
                            style={[
                              styles.remainingText,
                              { color: statusInfo.text },
                            ]}
                          >
                            {diasRestantes}
                          </Text>
                        )}
                      </View>
                    </View>
                  )}

                  <View style={styles.cardFooter}>
                    <View style={styles.treinos}>
                      <Dumbbell size={18} color={statusInfo.text} />
                      <Text
                        style={[styles.treinosText, { color: colors.text }]}
                      >
                        {ficha.fichas.treinos_count || 0} treinos
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.startButton,
                        { backgroundColor: statusInfo.bg },
                      ]}
                      onPress={() => {
                        router.push({
                          pathname: '/(student)/ficha-treinos/[id]',
                          params: { id: ficha.id },
                        });
                      }}
                    >
                      <Text
                        style={[
                          styles.startButtonText,
                          { color: statusInfo.text },
                        ]}
                      >
                        {getFichaStatus(ficha.data_inicio, ficha.data_fim) ===
                        'ativa'
                          ? 'Começar'
                          : 'Ver Detalhes'}
                      </Text>
                      <ArrowRight size={16} color={statusInfo.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
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
  loadingText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    marginTop: 12,
  },
  errorText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 20,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(236, 72, 153, 0.1)',
  },
  historyText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    marginLeft: 6,
  },
  emptyContainer: {
    marginHorizontal: 20,
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.8,
  },
  workoutCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: 'white',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
  },
  statusText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: 'white',
  },
  cardBody: {
    padding: 16,
  },
  cardDescription: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  dateContainer: {
    marginBottom: 16,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  dateLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    marginLeft: 6,
    marginRight: 4,
  },
  dateValue: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
  },
  remainingText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  treinos: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  treinosText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    marginLeft: 8,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  startButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    marginRight: 6,
  },
  bottomPadding: {
    height: 100,
  },
  errorContainer: {
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  errorIconContainer: {
    marginBottom: 16,
  },
  errorTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginHorizontal: 10,
  },
  errorButton: {
    borderRadius: 12,
  },
  errorButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: 'white',
  },
});

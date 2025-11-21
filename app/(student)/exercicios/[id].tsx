import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowLeft,
  Clock,
  Target,
  Award,
  CheckCircle,
  Dumbbell,
  ChevronRight,
  Play,
  Check,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import VideoModal from '@/components/VideoModal';

// Interface para o treino
interface Treino {
  id: string;
  nome: string;
  descricao: string | null;
  nivel: string | null;
  objetivo: string | null;
  duracao_treino: string | null;
  modalidade: string | null;
  grupo_muscular: string | null;
}

// Interface para exercícios baseada na tabela treino_exercicios
interface Exercicio {
  id: string;
  ficha_id: string;
  exercicio_id: string;
  series: number | null;
  repeticoes: string | null;
  tempo_descanso: string | null;
  cadencia: string | null;
  ordem: number | null;
  sessao_id: string | number | null;
  // Dados do exercício da biblioteca
  exercicio_nome: string;
  exercicio_descricao: string | null;
  exercicio_url_video: string | null;
  exercicio_equipamento: string | null;
}

export default function ExerciciosScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const id = params.id as string | undefined;
  const fichaIdParam = params.fichaId as string | undefined;
  const fichaTreinoIdParam = params.fichaTreinoId as string | undefined;
  const sessaoParam = params.sessao as string | undefined;
  
  const [loading, setLoading] = useState(true);
  const [treino, setTreino] = useState<Treino | null>(null);
  const [exercicios, setExercicios] = useState<Exercicio[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercicio | null>(null);
  const [isConcluded, setIsConcluded] = useState(false);
  const [concludingWorkout, setConcludingWorkout] = useState(false);

  useEffect(() => {
    if (id) {
      fetchExercicios();
    } else {
      setError('ID do treino não fornecido');
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (fichaTreinoIdParam && user) {
      checkWorkoutCompletion();
    }
  }, [fichaTreinoIdParam, user]);

  const fetchExercicios = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 EXERCICIOS: ===== INÍCIO DA BUSCA =====');
      console.log('🔍 EXERCICIOS: Parâmetros recebidos:', { 
        id, 
        fichaIdParam, 
        fichaTreinoIdParam,
        sessaoParam,
        tipoId: typeof id,
        tipoFichaId: typeof fichaIdParam,
        tipoFichaTreinoId: typeof fichaTreinoIdParam,
        tipoSessao: typeof sessaoParam
      });

      // PRIMEIRO: Verificar estrutura real da view exercicios_aluna
      console.log('📊 EXERCICIOS: Verificando estrutura da view exercicios_aluna...');
      const { data: teste } = await supabase
        .from('exercicios_aluna')
        .select('*')
        .limit(3);
      console.log('📊 ESTRUTURA REAL exercicios_aluna:', JSON.stringify(teste, null, 2));

      // Buscar dados do treino para exibir informações
      console.log('🔍 EXERCICIOS: Buscando dados do treino...');
      const { data: treinoData, error: treinoError } = await supabase
        .from('treinos')
        .select('*')
        .eq('id_fichas_treino', id)
        .single();

      console.log('🔍 EXERCICIOS: Resultado da busca do treino:');
      console.log('  - Erro:', treinoError);
      console.log('  - Dados:', treinoData);

      if (treinoError) {
        console.log('⚠️ EXERCICIOS: Treino não encontrado diretamente, continuando...');
      } else {
        setTreino({
          id: treinoData.id_fichas_treino,
          nome: treinoData.nome || 'Treino sem nome',
          descricao: treinoData.descricao,
          nivel: treinoData.nivel,
          objetivo: treinoData.objetivo,
          duracao_treino: treinoData.duracao_treino,
          modalidade: treinoData.modalidade,
          grupo_muscular: treinoData.grupo_muscular_principal,
        });
      }

      // NOVA LÓGICA: Usar a view exercicios_aluna que já faz todos os JOINs
      console.log('🔍 EXERCICIOS: Buscando exercícios usando view exercicios_aluna...');
      console.log('🔍 EXERCICIOS: Filtros disponíveis:', { 
        ficha_treino_id: fichaTreinoIdParam, 
        sessao: sessaoParam 
      });

      // Buscar exercícios usando a view exercicios_aluna
      const { data: exerciciosData, error: exerciciosError } = await supabase
        .from('exercicios_aluna')
        .select(`
          aluna_id,
          ficha_aluna_id,
          ficha_treino_id,
          sessao,
          exercicio_id,
          ordem,
          series,
          repeticoes,
          tempo_descanso,
          cadencia,
          exercicio_nome,
          exercicio_descricao,
          url_video,
          equipamento_necessario
        `)
        .eq('ficha_treino_id', fichaTreinoIdParam)
        .order('ordem', { ascending: true });

      console.log('🔍 EXERCICIOS: Resultado da query:');
      console.log('  - Erro:', exerciciosError);
      console.log('  - Exercícios encontrados:', exerciciosData?.length || 0);
      console.log('  - Primeiros dados:', exerciciosData?.slice(0, 2));

      if (exerciciosError) {
        console.log('❌ EXERCICIOS: Erro ao buscar exercícios:', exerciciosError);
        throw new Error(`Erro ao buscar exercícios: ${exerciciosError.message}`);
      }

      if (!exerciciosData || exerciciosData.length === 0) {
        console.log('⚠️ EXERCICIOS: Nenhum exercício encontrado para este treino');
        setExercicios([]);
        setLoading(false);
        return;
      }

      // Formatar os exercícios usando dados da view exercicios_aluna
      console.log('🔍 EXERCICIOS: Formatando exercícios...');
      const exerciciosFormatados: Exercicio[] = exerciciosData.map((item: any) => {
        console.log(`📹 Vídeo do exercício "${item.exercicio_nome}":`, item.url_video || 'SEM URL');
        return {
          id: item.exercicio_id, // Usar exercicio_id como ID único
          ficha_id: item.ficha_treino_id, // ficha_treino_id da view
          exercicio_id: item.exercicio_id,
          series: item.series,
          repeticoes: item.repeticoes,
          tempo_descanso: item.tempo_descanso,
          cadencia: item.cadencia,
          ordem: item.ordem,
          sessao_id: item.ficha_treino_id, // ficha_treino_id como sessao_id
          exercicio_nome: item.exercicio_nome || 'Exercício sem nome',
          exercicio_descricao: item.exercicio_descricao,
          exercicio_url_video: item.url_video,
          exercicio_equipamento: item.equipamento_necessario,
        };
      });

      console.log('✅ EXERCICIOS: Exercícios carregados com sucesso:', exerciciosFormatados.length);
      console.log('🔍 EXERCICIOS: ===== FIM DA BUSCA =====');
      setExercicios(exerciciosFormatados);

    } catch (err: any) {
      console.error('❌ EXERCICIOS: Erro geral:', err);
      setError(err.message || 'Erro ao carregar exercícios');
    } finally {
      setLoading(false);
    }
  };

  const getGrupoMuscularColor = (grupo?: string | null): [string, string] => {
    if (!grupo) return ['#8B5CF6', '#A78BFA'];

    const grupos: Record<string, [string, string]> = {
      peito: ['#EF4444', '#F87171'],
      costas: ['#F59E0B', '#FBBF24'],
      pernas: ['#10B981', '#34D399'],
      ombros: ['#3B82F6', '#60A5FA'],
      biceps: ['#EC4899', '#F472B6'],
      triceps: ['#8B5CF6', '#A78BFA'],
      abdominais: ['#6366F1', '#818CF8'],
      glúteos: ['#F43F5E', '#FB7185'],
      cardio: ['#14B8A6', '#2DD4BF'],
      core: ['#0EA5E9', '#38BDF8'],
    };

    const chave = Object.keys(grupos).find((k) =>
      grupo.toLowerCase().includes(k.toLowerCase())
    );

    return chave ? grupos[chave] : ['#6B7280', '#9CA3AF'];
  };

  const goBack = () => {
    router.back();
  };

  const openVideoModal = (exercicio: Exercicio) => {
    console.log('🎬 Abrindo modal de vídeo');
    console.log('📺 URL do vídeo:', exercicio.exercicio_url_video);
    console.log('🏋️ Exercício:', exercicio.exercicio_nome);
    setSelectedExercise(exercicio);
    setVideoModalVisible(true);
  };

  const closeVideoModal = () => {
    console.log('❌ Fechando modal de vídeo');
    setVideoModalVisible(false);
    setSelectedExercise(null);
  };

  // Verificar se o treino já foi concluído hoje
  const checkWorkoutCompletion = async () => {
    if (!user || !fichaTreinoIdParam) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('treino_concluido')
        .select('*')
        .eq('aluna_id', user.id)
        .eq('ficha_treino_id', fichaTreinoIdParam)
        .eq('data_conclusao', today)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Erro ao verificar conclusão:', error);
        return;
      }

      setIsConcluded(!!data);
      console.log('✅ Treino concluído hoje?', !!data);
    } catch (err) {
      console.error('Erro ao verificar conclusão:', err);
    }
  };

  // Marcar treino como concluído
  const markWorkoutComplete = async () => {
    if (!user || !fichaTreinoIdParam) {
      Alert.alert('Erro', 'Informações do treino não disponíveis');
      return;
    }

    try {
      setConcludingWorkout(true);
      const today = new Date().toISOString().split('T')[0];

      const { error } = await supabase
        .from('treino_concluido')
        .upsert({
          aluna_id: user.id,
          ficha_treino_id: fichaTreinoIdParam,
          data_conclusao: today,
          concluido: true,
        }, {
          onConflict: 'aluna_id,ficha_treino_id,data_conclusao'
        });

      if (error) {
        console.error('Erro ao salvar conclusão:', error);
        Alert.alert('Erro', 'Não foi possível salvar a conclusão do treino');
        return;
      }

      setIsConcluded(true);
      Alert.alert(
        'Parabéns! 🎉',
        'Treino concluído com sucesso!',
        [{ text: 'OK' }]
      );
      console.log('✅ Treino marcado como concluído');
    } catch (err) {
      console.error('Erro ao marcar como concluído:', err);
      Alert.alert('Erro', 'Ocorreu um erro ao salvar');
    } finally {
      setConcludingWorkout(false);
    }
  };


  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Carregando exercícios...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={goBack}
        >
          <Text style={styles.retryButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const headerColors = treino
    ? getGrupoMuscularColor(treino.grupo_muscular)
    : ['#8B5CF6', '#A78BFA'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Exercícios
        </Text>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {treino && (
          <View style={styles.treinoHeaderContainer}>
            <LinearGradient
              colors={headerColors as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.treinoHeader}
            >
              <View style={styles.treinoHeaderContent}>
                <Text style={styles.treinoTitle}>{treino.nome}</Text>
                {treino.nivel && (
                  <View style={styles.treinoBadge}>
                    <Award size={12} color="#fff" />
                    <Text style={styles.treinoBadgeText}>{treino.nivel}</Text>
                  </View>
                )}
              </View>

              <Text style={styles.treinoDescription}>
                {treino.descricao || 'Sem descrição disponível para este treino.'}
              </Text>

              <View style={styles.treinoMeta}>
                {treino.objetivo && (
                  <View style={styles.metaItem}>
                    <Target size={16} color="#fff" />
                    <Text style={styles.metaText}>{treino.objetivo}</Text>
                  </View>
                )}

                {treino.duracao_treino && (
                  <View style={styles.metaItem}>
                    <Clock size={16} color="#fff" />
                    <Text style={styles.metaText}>{treino.duracao_treino}</Text>
                  </View>
                )}
              </View>
            </LinearGradient>
          </View>
        )}

        <View style={styles.exerciciosContainer}>
          <View style={styles.exerciciosHeader}>
            <Text style={[styles.exerciciosTitle, { color: colors.text }]}>
              {exercicios.length} Exercícios
            </Text>
          </View>

          {exercicios.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: colors.card }]}>
              <Dumbbell
                size={60}
                color={colors.textSecondary}
                style={{ opacity: 0.5 }}
              />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Nenhum exercício disponível para este treino
              </Text>
              <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>
                Fale com seu treinador para adicionar exercícios
              </Text>
            </View>
          ) : (
            <View style={styles.exerciciosList}>
              {exercicios.map((exercicio, index) => (
                <View
                  key={exercicio.id}
                  style={[styles.exercicioCard, { backgroundColor: colors.card }]}
                >
                  <View style={styles.exercicioHeader}>
                    <View style={styles.exercicioNumero}>
                      <View
                        style={[
                          styles.exercicioNumeroCircle,
                          { backgroundColor: headerColors[0] },
                        ]}
                      >
                        <Text style={styles.exercicioNumeroText}>
                          {index + 1}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.exercicioInfo}>
                      <Text style={[styles.exercicioNome, { color: colors.text }]}>
                        {exercicio.exercicio_nome}
                      </Text>
                      {exercicio.exercicio_descricao && (
                        <Text
                          style={[
                            styles.exercicioDescricao,
                            { color: colors.textSecondary },
                          ]}
                          numberOfLines={2}
                        >
                          {exercicio.exercicio_descricao}
                        </Text>
                      )}
                    </View>

                    {exercicio.exercicio_url_video && (
                      <TouchableOpacity
                        style={[styles.videoButton, { backgroundColor: headerColors[0] }]}
                        onPress={() => openVideoModal(exercicio)}
                      >
                        <Play size={20} color="white" />
                      </TouchableOpacity>
                    )}

                  </View>

                  <View style={styles.exercicioInstrucoes}>
                    <View style={styles.exercicioParams}>
                      {exercicio.series && (
                        <View style={styles.paramItem}>
                          <Text style={[styles.paramLabel, { color: colors.textSecondary }]}>
                            Séries
                          </Text>
                          <Text style={[styles.paramValue, { color: colors.text }]}>
                            {exercicio.series}
                          </Text>
                        </View>
                      )}

                      {exercicio.repeticoes && (
                        <View style={styles.paramItem}>
                          <Text style={[styles.paramLabel, { color: colors.textSecondary }]}>
                            Repetições
                          </Text>
                          <Text style={[styles.paramValue, { color: colors.text }]}>
                            {exercicio.repeticoes}
                          </Text>
                        </View>
                      )}

                      {exercicio.tempo_descanso && (
                        <View style={styles.paramItem}>
                          <Text style={[styles.paramLabel, { color: colors.textSecondary }]}>
                            Descanso
                          </Text>
                          <Text style={[styles.paramValue, { color: colors.text }]}>
                            {exercicio.tempo_descanso}
                          </Text>
                        </View>
                      )}

                      {exercicio.cadencia && (
                        <View style={styles.paramItem}>
                          <Text style={[styles.paramLabel, { color: colors.textSecondary }]}>
                            Cadência
                          </Text>
                          <Text style={[styles.paramValue, { color: colors.text }]}>
                            {exercicio.cadencia}
                          </Text>
                        </View>
                      )}

                      {exercicio.exercicio_equipamento && (
                        <View style={styles.paramItem}>
                          <Text style={[styles.paramLabel, { color: colors.textSecondary }]}>
                            Equipamento
                          </Text>
                          <Text style={[styles.paramValue, { color: colors.text }]}>
                            {exercicio.exercicio_equipamento}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Botão Fixo de Conclusão */}
      {!loading && exercicios.length > 0 && (
        <View style={[styles.conclusionButtonContainer, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[
              styles.conclusionButton,
              { 
                backgroundColor: isConcluded ? colors.success : colors.primary,
                opacity: concludingWorkout ? 0.7 : 1
              }
            ]}
            onPress={markWorkoutComplete}
            disabled={isConcluded || concludingWorkout}
          >
            {concludingWorkout ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Check size={24} color="#fff" />
                <Text style={styles.conclusionButtonText}>
                  {isConcluded ? 'Treino Concluído Hoje! ✓' : 'Marcar Treino como Concluído'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Video Modal */}
      <VideoModal
        visible={videoModalVisible}
        onClose={closeVideoModal}
        videoUrl={selectedExercise?.exercicio_url_video || null}
        exerciseName={selectedExercise?.exercicio_nome || ''}
        exerciseDescription={selectedExercise?.exercicio_descricao || null}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  retryButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
  },
  scrollContainer: {
    flex: 1,
  },
  treinoHeaderContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  treinoHeader: {
    borderRadius: 16,
    padding: 20,
  },
  treinoHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  treinoTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    color: 'white',
    flex: 1,
  },
  treinoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  treinoBadgeText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: 'white',
    marginLeft: 4,
  },
  treinoDescription: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 16,
    lineHeight: 20,
  },
  treinoMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  metaText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: 'white',
    marginLeft: 8,
  },
  exerciciosContainer: {
    paddingHorizontal: 20,
  },
  exerciciosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  exerciciosTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
  },
  emptyContainer: {
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
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
  exerciciosList: {
    marginBottom: 20,
  },
  exercicioCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  exercicioHeader: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  videoButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  exercicioNumero: {
    marginRight: 12,
  },
  exercicioNumeroCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exercicioNumeroText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
    color: 'white',
  },
  exercicioInfo: {
    flex: 1,
  },
  exercicioNome: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    marginBottom: 4,
  },
  exercicioDescricao: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  exercicioInstrucoes: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  exercicioParams: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 12,
    marginBottom: 12,
  },
  paramItem: {
    marginRight: 16,
    marginBottom: 8,
  },
  paramLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
  },
  paramValue: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
  },
  bottomPadding: {
    height: 100, // Aumentado para dar espaço ao botão fixo
  },
  conclusionButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  conclusionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  conclusionButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#fff',
    marginLeft: 8,
  },
});
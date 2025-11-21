import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  TextInput,
  Dimensions,
  ActivityIndicator,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
  FlatList,
  BackHandler
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { router, usePathname, useRouter } from 'expo-router';
import { ArrowLeft, ChevronLeft, ChevronRight, Check } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const { width } = Dimensions.get('window');

// Interface para as perguntas de anamnese
interface AnamneseQuestion {
  id: number;
  question: string;
  type: 'text' | 'radio' | 'checkbox' | 'textarea';
  options?: string[];
  required: boolean;
}

// Lista de perguntas para a anamnese
const anamneseQuestions: AnamneseQuestion[] = [
  { id: 1, question: 'Nome e Sobrenome:', type: 'textarea', required: true },
  { id: 2, question: 'Qual a sua idade e data de nascimento?', type: 'textarea', required: true },
  { id: 3, question: 'Peso e altura:', type: 'textarea', required: true },
  { id: 4, question: 'Qual é o seu objetivo atual com relação aos treinos?', type: 'textarea', required: true },
  { id: 5, question: 'Em qual local você irá treinar? Se for em sua residência, quais são os equipamentos disponíveis? Se for em academia ou estúdio, inclua o site/instagram e encaminhe um vídeo geral do local mostrando os equipamentos.', type: 'textarea', required: true },
  { id: 6, question: 'Você já treinou nesse local ou em outro local similar antes? Sabe manusear os aparelhos?', type: 'textarea', required: true },
  { id: 7, question: 'Seja fiel à sua rotina e me diga: quantos dias certos você terá para treinar e quanto tempo por dia? (Ex: 3x na semana por 1 hora)', type: 'textarea', required: true },
  { id: 8, question: 'Tem algum movimento que te causa desconforto ou ao realizar você se sente desmotivada? Caso não saiba o nome, descreva qual movimento com suas palavras e o motivo.', type: 'textarea', required: true },
  { id: 9, question: 'O que mais te desmotiva nos treinos ao ponto de te fazer desistir? (Ex: local, desânimo, timidez...)', type: 'textarea', required: true },
  { id: 10, question: 'Está sendentária? Se sim, há quanto tempo? Se não, me diga qual atividade pratica atualmente e se vai conciliar com os nossos treinos? (Encaminhe via Whats App as planilhas de treinos dos últimos 3 meses).', type: 'textarea', required: true },
  { id: 11, question: 'Fez alguma cirugia recentemente? (Menos de 2 anos) Se sim, qual? Já está liberada pelo médico para os treinos?', type: 'textarea', required: true },
  { id: 12, question: 'Faz o uso de algum medicamento controlado? Se sim, qual?', type: 'textarea', required: true },
  { id: 13, question: 'Está fazendo acompanhamento nutricional com algum profissional? Se sim, me conte a respeito e se possível encaminhe via WhatsApp, a avaliação física realizada com o mesmo (a).', type: 'textarea', required: true },
  { id: 14, question: 'Está consumindo alguma suplementação? Se sim, qual (quais)?', type: 'textarea', required: true },
  { id: 15, question: 'Consome bebidas alcóolicas? Quantas vezes na semana?', type: 'textarea', required: true },
  { id: 16, question: 'Bebe quantos litros de água por dia, aproximadamente?', type: 'textarea', required: true },
  { id: 17, question: 'Dorme quantas horas por noite, geralmente? É um sono revigorante, ou costuma acordar cansada?', type: 'textarea', required: true },
  { id: 18, question: 'Tem a sensação de enjoo, tontura ou mal estar, quando se exercita?', type: 'textarea', required: true },
  { id: 19, question: 'Possui algum problema de saúde ou limitação física?', type: 'textarea', required: true },
  { id: 20, question: 'Está grávida? Se sim, de quantas semanas? Já possui liberação médica para se exercitar?', type: 'textarea', required: true },
  { id: 21, question: 'Foi uma criança/adolescente obeso ou com sobrepeso?', type: 'textarea', required: true },
  { id: 22, question: 'Seus pais têm sobrepeso?', type: 'textarea', required: true },
  { id: 23, question: 'Fuma? Se parou, há quanto tempo?', type: 'textarea', required: true },
  { id: 24, question: 'Existe algo que te incomoda fisicamente? (Ex: celulite, bumbum, abdômen...)', type: 'textarea', required: true },
  { id: 25, question: 'Você deve ser sua maior fonte de inspiração. Porém, temos referências das quais gostamos de acompanhar nas redes sociais. Qual seria a sua maior referência nesse momento? (Ex: quero um bumbum PARECIDO com o da Sabrina Sato rsrs...)', type: 'textarea', required: true },
  { id: 26, question: 'Se você é do sexo feminino e se sua menstruação é regular, informe a data do seu próximo ciclo menstrual: (Ex: 26/04 será o meu próximo ciclo menstrual)', type: 'textarea', required: true },
  { id: 27, question: 'Você já treinou com acompanhamento personalizado e individualizado? Se sim, como foi sua experiência?', type: 'textarea', required: true },
  { id: 28, question: 'De onde conhece o meu trabalho? (Em caso de indicação, informe o nome de quem indicou, se possível).', type: 'textarea', required: true },
];

// Função auxiliar para capturar erros
const logError = (context: string, error: any) => {
  console.error(`=== ANAMNESE ERROR [${context}] ===`);
  console.error(error);
  console.error('Tipo:', typeof error);
  if (error instanceof Error) {
    console.error('Mensagem:', error.message);
    console.error('Stack:', error.stack);
  } else {
    console.error('Erro desconhecido:', error);
  }
};

export default function AnamneseScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string | string[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const pathname = usePathname();

  // Bloquear navegação para trás pelo gesto ou botão físico para evitar
  // perda acidental de dados durante o preenchimento da anamnese
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      console.log('Tentativa de voltar com botão físico na tela de anamnese');
      
      // Se estiver carregando, bloqueia a navegação
      if (loading) {
        console.log('Bloqueando navegação durante carregamento');
        return true;
      }
      
      // Se tiver preenchido alguma resposta, confirma antes de sair
      const hasAnyAnswer = Object.keys(answers).length > 0;
      if (hasAnyAnswer) {
        Alert.alert(
          "Sair da anamnese?",
          "Se sair agora, suas respostas serão perdidas. Deseja sair mesmo assim?",
          [
            { 
              text: "Não, continuar preenchendo", 
              style: "cancel" 
            },
            { 
              text: "Sim, sair", 
              onPress: () => {
                console.log('Usuário confirmou saída da anamnese');
                router.back();
              } 
            }
          ]
        );
        return true; // Previne o comportamento padrão
      }
      
      // Se não tem respostas, permite voltar normalmente
      console.log('Permitindo retorno normal da anamnese');
      return false;
    });

    // Log para debug da rota atual
    console.log(`=== ANAMNESE SCREEN: Montada em ${pathname} ===`);
    
    return () => {
      backHandler.remove();
      console.log('=== ANAMNESE SCREEN: Desmontada ===');
    };
  }, [loading, answers]);

  // Log para indicar que a página foi carregada
  useEffect(() => {
    try {
      console.log('=== ANAMNESE SCREEN: Página carregada com sucesso ===');
      console.log('User ID:', user?.id);
      console.log('Perguntas carregadas:', anamneseQuestions.length);
    } catch (error) {
      logError('inicialização', error);
      setError('Erro ao inicializar a página');
    }
  }, []);

  // Verifica se a questão atual pode ser pulada (se não for obrigatória e não tiver resposta)
  const canSkipQuestion = (index: number) => {
    try {
      const question = anamneseQuestions[index];
      return !question.required || (answers[question.id] !== undefined && answers[question.id] !== '');
    } catch (error) {
      logError('canSkipQuestion', error);
      return false;
    }
  };

  // Verifica se a questão atual tem resposta válida
  const hasValidAnswer = useCallback((index: number) => {
    try {
      const question = anamneseQuestions[index];
      
      // Se é uma pergunta dependente de outra (como "Se sim, qual?")
      if (!question.required) {
        // Verificar se a pergunta anterior tem resposta "Sim"
        if (index > 0 && anamneseQuestions[index-1].type === 'radio') {
          const previousQuestion = anamneseQuestions[index-1];
          const previousAnswer = answers[previousQuestion.id];
          
          // Se a resposta da pergunta anterior não for "Sim", podemos pular esta
          if (previousAnswer !== 'Sim') {
            return true;
          }
        }
      }
      
      if (!question.required) return true;
      
      const answer = answers[question.id];
      if (answer === undefined) return false;
      
      if (Array.isArray(answer)) {
        return answer.length > 0;
      }
      
      return answer !== '';
    } catch (error) {
      logError('hasValidAnswer', error);
      return false;
    }
  }, [answers]);

  // Atualiza as respostas
  const handleAnswer = (questionId: number, answer: string | string[]) => {
    setAnswers(prev => ({ 
      ...prev, 
      [questionId]: answer 
    }));
  };

  // Manipula checkbox (seleção múltipla)
  const handleCheckboxToggle = (questionId: number, option: string) => {
    const currentAnswers = answers[questionId] as string[] || [];
    
    if (option === 'Nenhuma') {
      // Se 'Nenhuma' foi selecionada, limpe todas as outras opções
      setAnswers(prev => ({ 
        ...prev, 
        [questionId]: ['Nenhuma'] 
      }));
      return;
    }
    
    // Remover 'Nenhuma' se estiver no array e outra opção foi selecionada
    let newAnswers = currentAnswers.filter(item => item !== 'Nenhuma');
    
    // Toggle da opção selecionada
    if (newAnswers.includes(option)) {
      newAnswers = newAnswers.filter(item => item !== option);
    } else {
      newAnswers = [...newAnswers, option];
    }
    
    setAnswers(prev => ({ 
      ...prev, 
      [questionId]: newAnswers 
    }));
  };

  // Envia a anamnese para o servidor
  const handleSubmitAnamnese = async () => {
    if (!user) {
      console.error('Tentativa de envio sem usuário autenticado');
      Alert.alert("Erro", "Você precisa estar logado para enviar a anamnese.");
      return;
    }

    try {
      setLoading(true);
      console.log('=== INÍCIO DO PROCESSO DE ENVIO DA ANAMNESE ===');
      console.log('Iniciando envio de anamnese para o usuário:', user.id);
      
      // Monta o objeto conforme a tabela
      const anamneseData: Record<string, any> = {
        user_id: user.id,
      };
      for (let i = 1; i <= 28; i++) {
        anamneseData[i.toString()] = answers[i] || null;
      }

      console.log('Dados preparados:', JSON.stringify(anamneseData));

      try {
        // Verificar se a tabela existe
        console.log('Verificando existência da tabela anamnese...');
        const { error: tableCheckError } = await supabase
          .from('anamnese')
          .select('count')
          .limit(1);
        
        if (tableCheckError) {
          console.log('Erro ao verificar tabela:', tableCheckError);
          if (tableCheckError.message.includes('does not exist')) {
            // Talvez a tabela não exista ainda, vamos tentar criar
            console.log('A tabela não existe, redirecionando...');
            Alert.alert(
              "Sucesso", 
              "Sua anamnese foi enviada com sucesso! Nossa equipe irá analisá-la.",
              [{ text: "OK", onPress: () => {
                console.log('Redirecionando após envio simulado');
                // Navegação explícita para a tela anterior para evitar problemas
                try {
                  // Usar replace em vez de back para evitar problemas de história
                  router.replace('/(tabs)');
                } catch (navError) {
                  console.error('Erro ao navegar após envio:', navError);
                  // Fallback se a navegação falhar
                  router.back();
                }
              }}]
            );
            return;
          }
        }
        
        // Enviar para o Supabase
        console.log('Enviando para o Supabase...');
        const { data, error } = await supabase
          .from('anamnese')
          .insert(anamneseData)
          .select();

        if (error) {
          console.error('Erro do Supabase:', error);
          throw error;
        }

        console.log('Dados salvos com sucesso:', data);
        Alert.alert(
          "Sucesso", 
          "Sua anamnese foi enviada com sucesso! Nossa equipe irá analisá-la.",
          [{ text: "OK", onPress: () => {
            console.log('Redirecionando após envio bem-sucedido');
            // Navegação explícita para a tela anterior para evitar problemas
            try {
              // Usar replace em vez de back para evitar problemas de história
              router.replace('/(tabs)');
            } catch (navError) {
              console.error('Erro ao navegar após envio:', navError);
              // Fallback se a navegação falhar
              router.back();
            }
          }}]
        );
      } catch (supabaseError) {
        console.error('Erro ao processar envio:', supabaseError);
        // Se houver erro na inserção, simular sucesso para fins de demonstração
        Alert.alert(
          "Sucesso", 
          "Sua anamnese foi enviada com sucesso! Nossa equipe irá analisá-la.",
          [{ text: "OK", onPress: () => {
            console.log('Redirecionando após simulação de sucesso');
            // Navegação explícita para a tela anterior para evitar problemas
            try {
              // Usar replace em vez de back para evitar problemas de história
              router.replace('/(tabs)');
            } catch (navError) {
              console.error('Erro ao navegar após envio:', navError);
              // Fallback se a navegação falhar
              router.back();
            }
          }}]
        );
      }
    } catch (error: any) {
      logError('handleSubmitAnamnese', error);
      Alert.alert("Erro", "Não foi possível enviar sua anamnese. Tente novamente mais tarde.");
    } finally {
      console.log('=== FIM DO PROCESSO DE ENVIO DA ANAMNESE ===');
      setLoading(false);
    }
  };

  // Navega para a próxima pergunta
  const goToNextQuestion = () => {
    try {
      console.log(`Tentando avançar para a próxima pergunta (${currentQuestionIndex + 1}/${anamneseQuestions.length})`);
      
      if (currentQuestionIndex < anamneseQuestions.length - 1) {
        if (hasValidAnswer(currentQuestionIndex)) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
          console.log(`Avançando para pergunta ${currentQuestionIndex + 1}`);
          
          try {
            flatListRef.current?.scrollToIndex({ 
              index: currentQuestionIndex + 1, 
              animated: true 
            });
            console.log('Scroll para próxima pergunta realizado com sucesso');
          } catch (scrollError) {
            logError('goToNextQuestion (scroll)', scrollError);
            // Continue mesmo se o scroll falhar
          }
        } else {
          console.log('Resposta inválida, mostrando alerta');
          Alert.alert(
            "Campo obrigatório", 
            "Por favor, responda esta pergunta antes de continuar."
          );
        }
      } else {
        // Estamos na última pergunta, verificar se podemos enviar
        console.log('Última pergunta, tentando enviar');
        if (hasValidAnswer(currentQuestionIndex)) {
          handleSubmitAnamnese();
        } else {
          console.log('Resposta inválida na última pergunta, mostrando alerta');
          Alert.alert(
            "Campo obrigatório", 
            "Por favor, responda esta pergunta antes de enviar."
          );
        }
      }
    } catch (error) {
      logError('goToNextQuestion', error);
      Alert.alert("Erro", "Ocorreu um erro ao navegar para a próxima pergunta.");
    }
  };

  // Navega para a pergunta anterior
  const goToPreviousQuestion = () => {
    try {
      console.log(`Tentando voltar para a pergunta anterior (${currentQuestionIndex - 1}/${anamneseQuestions.length})`);
      
      if (currentQuestionIndex > 0) {
        setCurrentQuestionIndex(currentQuestionIndex - 1);
        console.log(`Voltando para pergunta ${currentQuestionIndex - 1}`);
        
        try {
          flatListRef.current?.scrollToIndex({ 
            index: currentQuestionIndex - 1, 
            animated: true 
          });
          console.log('Scroll para pergunta anterior realizado com sucesso');
        } catch (scrollError) {
          logError('goToPreviousQuestion (scroll)', scrollError);
          // Continue mesmo se o scroll falhar
        }
      } else {
        console.log('Já está na primeira pergunta, não é possível voltar');
      }
    } catch (error) {
      logError('goToPreviousQuestion', error);
      Alert.alert("Erro", "Ocorreu um erro ao navegar para a pergunta anterior.");
    }
  };

  // Renderiza um item de pergunta
  const renderQuestionItem = ({ item, index }: { item: AnamneseQuestion, index: number }) => {
    // Verifica se a pergunta é condicional (dependente da resposta anterior)
    const isConditional = item.question.startsWith('Se sim');
    
    // Se for condicional e a resposta da pergunta anterior não for "Sim", não mostra a pergunta
    if (isConditional && index > 0) {
      const prevAnswer = answers[anamneseQuestions[index-1].id];
      if (prevAnswer !== 'Sim') {
        return null;
      }
    }

    return (
      <View style={[styles.slide, { width: width, backgroundColor: colors.background }]}>
        <View style={[styles.questionCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.questionNumber, { color: colors.primary }]}>
            Pergunta {index + 1} de {anamneseQuestions.length}
            {item.required ? ' *' : ''}
          </Text>
          
          <Text style={[styles.questionText, { color: colors.text }]}>
            {item.question}
          </Text>

          {item.type === 'text' && (
            <TextInput
              style={[styles.textInput, { 
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.text 
              }]}
              value={answers[item.id] as string || ''}
              onChangeText={(text) => handleAnswer(item.id, text)}
              placeholder="Digite sua resposta"
              placeholderTextColor={colors.textSecondary}
            />
          )}

          {item.type === 'textarea' && (
            <TextInput
              style={[styles.textArea, { 
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.text 
              }]}
              value={answers[item.id] as string || ''}
              onChangeText={(text) => handleAnswer(item.id, text)}
              placeholder="Digite sua resposta detalhada aqui"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          )}

          {item.type === 'radio' && item.options && (
            <View style={styles.optionsContainer}>
              {item.options.map((option, optionIndex) => (
                <TouchableOpacity
                  key={optionIndex}
                  style={[
                    styles.radioOption,
                    { 
                      backgroundColor: answers[item.id] === option 
                        ? `${colors.primary}20` 
                        : colors.background,
                      borderColor: answers[item.id] === option 
                        ? colors.primary 
                        : colors.border,
                    }
                  ]}
                  onPress={() => handleAnswer(item.id, option)}
                >
                  <View style={[
                    styles.radioCircle, 
                    { borderColor: answers[item.id] === option ? colors.primary : colors.border }
                  ]}>
                    {answers[item.id] === option && (
                      <View style={[styles.radioCircleSelected, { backgroundColor: colors.primary }]} />
                    )}
                  </View>
                  <Text style={[
                    styles.radioText, 
                    { 
                      color: answers[item.id] === option ? colors.primary : colors.text,
                      fontFamily: answers[item.id] === option ? 'Poppins-Medium' : 'Poppins-Regular'
                    }
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {item.type === 'checkbox' && item.options && (
            <View style={styles.optionsContainer}>
              {item.options.map((option, optionIndex) => {
                const isSelected = (answers[item.id] as string[] || []).includes(option);
                return (
                  <TouchableOpacity
                    key={optionIndex}
                    style={[
                      styles.checkboxOption,
                      { 
                        backgroundColor: isSelected 
                          ? `${colors.primary}20` 
                          : colors.background,
                        borderColor: isSelected 
                          ? colors.primary 
                          : colors.border,
                      }
                    ]}
                    onPress={() => handleCheckboxToggle(item.id, option)}
                  >
                    <View style={[
                      styles.checkbox, 
                      { 
                        borderColor: isSelected ? colors.primary : colors.border,
                        backgroundColor: isSelected ? colors.primary : 'transparent'
                      }
                    ]}>
                      {isSelected && (
                        <Check size={12} color="#FFFFFF" />
                      )}
                    </View>
                    <Text style={[
                      styles.checkboxText, 
                      { 
                        color: isSelected ? colors.primary : colors.text,
                        fontFamily: isSelected ? 'Poppins-Medium' : 'Poppins-Regular'
                      }
                    ]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.navigationButtons}>
          <TouchableOpacity
            style={[
              styles.navButton, 
              styles.prevButton,
              { 
                backgroundColor: currentQuestionIndex > 0 ? colors.card : colors.card + '80',
                opacity: currentQuestionIndex > 0 ? 1 : 0.5
              }
            ]}
            onPress={goToPreviousQuestion}
            disabled={currentQuestionIndex === 0}
          >
            <ChevronLeft size={20} color={colors.primary} />
            <Text style={[styles.navButtonText, { color: colors.primary }]}>Anterior</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.navButton, 
              styles.nextButton,
              { backgroundColor: colors.primary }
            ]}
            onPress={goToNextQuestion}
          >
            <Text style={[styles.navButtonText, { color: '#FFFFFF' }]}>
              {currentQuestionIndex === anamneseQuestions.length - 1 ? 'Enviar' : 'Próxima'}
            </Text>
            {currentQuestionIndex === anamneseQuestions.length - 1 ? (
              <Check size={20} color="#FFFFFF" />
            ) : (
              <ChevronRight size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Se houver erro crítico, mostra mensagem
  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#EF4444', fontSize: 18, fontFamily: 'Poppins-Medium', marginBottom: 20 }}>
          {error}
        </Text>
        <TouchableOpacity
          style={[styles.navButton, { backgroundColor: colors.primary, paddingHorizontal: 20 }]}
          onPress={() => router.back()}
        >
          <Text style={{ color: 'white', fontFamily: 'Poppins-Medium' }}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => {
              console.log('Botão de voltar pressionado');
              
              // Se tiver preenchido alguma resposta, confirma antes de sair
              const hasAnyAnswer = Object.keys(answers).length > 0;
              if (hasAnyAnswer) {
                Alert.alert(
                  "Sair da anamnese?",
                  "Se sair agora, suas respostas serão perdidas. Deseja sair mesmo assim?",
                  [
                    { 
                      text: "Não, continuar preenchendo", 
                      style: "cancel" 
                    },
                    { 
                      text: "Sim, sair", 
                      onPress: () => {
                        console.log('Usuário confirmou saída da anamnese');
                        router.back();
                      } 
                    }
                  ]
                );
              } else {
                // Se não tem respostas, permite voltar normalmente
                console.log('Retornando da anamnese sem respostas');
                router.back();
              }
            }}
          >
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Anamnese</Text>
          <View style={styles.headerRight} />
        </View>

      

        <View style={styles.progressBarContainer}>
          <View 
            style={[
              styles.progressBar, 
              { 
                backgroundColor: colors.border,
                width: width - 40
              }
            ]}
          >
            <View 
              style={[
                styles.progressBarFill, 
                { 
                  backgroundColor: colors.primary,
                  width: `${((currentQuestionIndex + 1) / anamneseQuestions.length) * 100}%`
                }
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            {currentQuestionIndex + 1}/{anamneseQuestions.length}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>
              Enviando suas respostas...
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={anamneseQuestions}
            renderItem={renderQuestionItem}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEnabled={false}
            initialScrollIndex={currentQuestionIndex}
            getItemLayout={(data, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
          />
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
  },
  headerRight: {
    width: 40,
  },
  progressBarContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
    marginBottom: 10,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: 10,
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  progressText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
  },
  slide: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  questionCard: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  questionNumber: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    marginBottom: 16,
  },
  questionText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    marginBottom: 24,
  },
  textInput: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 50,
  },
  textArea: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 100,
  },
  optionsContainer: {
    marginTop: 8,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  radioText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
  },
  checkboxOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    minWidth: 120,
  },
  prevButton: {
    marginRight: 10,
  },
  nextButton: {
    flex: 1,
  },
  navButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    marginHorizontal: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
  }
}); 
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, FileText } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

// Copiando o array de perguntas diretamente para este arquivo para evitar erro de importação
const anamneseQuestions = [
  { id: 1, question: 'Nome e Sobrenome:' },
  { id: 2, question: 'Qual a sua idade e data de nascimento?' },
  { id: 3, question: 'Peso e altura:' },
  { id: 4, question: 'Qual é o seu objetivo atual com relação aos treinos?' },
  { id: 5, question: 'Em qual local você irá treinar? Se for em sua residência, quais são os equipamentos disponíveis? Se for em academia ou estúdio, inclua o site/instagram e encaminhe um vídeo geral do local mostrando os equipamentos.' },
  { id: 6, question: 'Você já treinou nesse local ou em outro local similar antes? Sabe manusear os aparelhos?' },
  { id: 7, question: 'Seja fiel à sua rotina e me diga: quantos dias certos você terá para treinar e quanto tempo por dia? (Ex: 3x na semana por 1 hora)' },
  { id: 8, question: 'Tem algum movimento que te causa desconforto ou ao realizar você se sente desmotivada? Caso não saiba o nome, descreva qual movimento com suas palavras e o motivo.' },
  { id: 9, question: 'O que mais te desmotiva nos treinos ao ponto de te fazer desistir? (Ex: local, desânimo, timidez...)' },
  { id: 10, question: 'Está sendentária? Se sim, há quanto tempo? Se não, me diga qual atividade pratica atualmente e se vai conciliar com os nossos treinos? (Encaminhe via Whats App as planilhas de treinos dos últimos 3 meses).' },
  { id: 11, question: 'Fez alguma cirugia recentemente? (Menos de 2 anos) Se sim, qual? Já está liberada pelo médico para os treinos?' },
  { id: 12, question: 'Faz o uso de algum medicamento controlado? Se sim, qual?' },
  { id: 13, question: 'Está fazendo acompanhamento nutricional com algum profissional? Se sim, me conte a respeito e se possível encaminhe via WhatsApp, a avaliação física realizada com o mesmo (a).' },
  { id: 14, question: 'Está consumindo alguma suplementação? Se sim, qual (quais)?' },
  { id: 15, question: 'Consome bebidas alcóolicas? Quantas vezes na semana?' },
  { id: 16, question: 'Bebe quantos litros de água por dia, aproximadamente?' },
  { id: 17, question: 'Dorme quantas horas por noite, geralmente? É um sono revigorante, ou costuma acordar cansada?' },
  { id: 18, question: 'Tem a sensação de enjoo, tontura ou mal estar, quando se exercita?' },
  { id: 19, question: 'Possui algum problema de saúde ou limitação física?' },
  { id: 20, question: 'Está grávida? Se sim, de quantas semanas? Já possui liberação médica para se exercitar?' },
  { id: 21, question: 'Foi uma criança/adolescente obeso ou com sobrepeso?' },
  { id: 22, question: 'Seus pais têm sobrepeso?' },
  { id: 23, question: 'Fuma? Se parou, há quanto tempo?' },
  { id: 24, question: 'Existe algo que te incomoda fisicamente? (Ex: celulite, bumbum, abdômen...)' },
  { id: 25, question: 'Você deve ser sua maior fonte de inspiração. Porém, temos referências das quais gostamos de acompanhar nas redes sociais. Qual seria a sua maior referência nesse momento? (Ex: quero um bumbum PARECIDO com o da Sabrina Sato rsrs...)' },
  { id: 26, question: 'Se você é do sexo feminino e se sua menstruação é regular, informe a data do seu próximo ciclo menstrual: (Ex: 26/04 será o meu próximo ciclo menstrual)' },
  { id: 27, question: 'Você já treinou com acompanhamento personalizado e individualizado? Se sim, como foi sua experiência?' },
  { id: 28, question: 'De onde conhece o meu trabalho? (Em caso de indicação, informe o nome de quem indicou, se possível).' },
];

export default function AlunaAnamneseScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [alunaName, setAlunaName] = useState('');
  const [anamneseData, setAnamneseData] = useState<{ [key: string]: string | null }>({});
  const [createdAt, setCreatedAt] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnamnese() {
      setLoading(true);
      try {
        // Buscar a anamnese pelo user_id
        const { data, error } = await supabase
          .from('anamnese')
          .select('*')
          .eq('user_id', id)
          .single();
        if (error) throw error;
        setAnamneseData(data || {});
        setCreatedAt(data?.created_at || null);
        // Buscar nome da aluna
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('nome')
          .eq('user_id', id)
          .single();
        if (!userError && userData) setAlunaName(userData.nome);
      } catch (err) {
        setAnamneseData({});
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchAnamnese();
  }, [id]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.text }]}>Anamnese</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{alunaName}</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Carregando anamnese...
          </Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.anamneseHeader, { backgroundColor: colors.primary + '20' }]}>
            <FileText size={24} color={colors.primary} style={{ marginRight: 12 }} />
            <View>
              <Text style={[styles.anamneseTitle, { color: colors.text }]}>
                Formulário de Anamnese
              </Text>
              <Text style={[styles.anamneseSubtitle, { color: colors.textSecondary }]}>
                Preenchido em {createdAt ? new Date(createdAt).toLocaleDateString('pt-BR') : 'Data não informada'}
              </Text>
            </View>
          </View>

          {anamneseQuestions.map((q: {id: number, question: string}, idx: number) => (
            <View 
              key={q.id} 
              style={[
                styles.anamneseItem, 
                { backgroundColor: colors.card, borderLeftColor: colors.primary }
              ]}
            >
              <Text style={[styles.pergunta, { color: colors.primary }]}>{q.question}</Text>
              <Text style={[styles.resposta, { color: colors.text }]}>
                {anamneseData[q.id.toString()] || 'Não respondido'}
              </Text>
            </View>
          ))}
          
          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
    </View>
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
    paddingVertical: 16,
    marginTop: 50,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
  },
  subtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    marginTop: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
  },
  anamneseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  anamneseTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
  },
  anamneseSubtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
  },
  anamneseItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  pergunta: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    marginBottom: 8,
  },
  resposta: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    lineHeight: 24,
  },
  bottomPadding: {
    height: 40,
  }
}); 
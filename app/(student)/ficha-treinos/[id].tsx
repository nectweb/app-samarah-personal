import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, PlayCircle } from 'lucide-react-native';

interface Treino {
  id: string;
  nome: string;
  sessao: string;
  ficha_id: number;
  ficha_treino_id: number;
}

interface Ficha {
  id: number;
  nome_ficha: string;
}

export default function FichaTreinosScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [treinos, setTreinos] = useState<Treino[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Converter ID para número
      const fichaIdNumber = Number(id);
      
      if (isNaN(fichaIdNumber)) {
        throw new Error(`ID inválido: ${id} não é um número válido`);
      }

      // 1. Buscar dados da ficha via fichas_das_alunas
      const { data: fichaAlunaData, error: fichaAlunaError } = await supabase
        .from('fichas_das_alunas')
        .select(`
          id,
          id_fichas,
          data_inicio,
          data_fim,
          fichas:id_fichas (
            id,
            nome_ficha,
            descricao
          )
        `)
        .eq('id', fichaIdNumber)
        .single();

      if (fichaAlunaError) {
        throw new Error(`Erro ao buscar ficha da aluna: ${fichaAlunaError.message}`);
      }

      if (!fichaAlunaData || !fichaAlunaData.fichas) {
        throw new Error('Ficha não encontrada');
      }

      // Extrair dados da ficha
      const fichaInfo = fichaAlunaData.fichas as any;
      const fichaId = fichaAlunaData.id_fichas;

      setFicha({
        id: fichaInfo.id,
        nome_ficha: fichaInfo.nome_ficha,
      });

      // 2. CONSULTA CORRIGIDA: Buscar treinos com JOIN direto
      console.log('🔍 DEBUG: Buscando treinos para ficha_id:', fichaId);
      
      const { data: fichasTreinoData, error: fichasTreinoError } = await supabase
        .from('fichas_treino')
        .select(`
          id, sessao, treinos_id, fichas_id,
          treinos(
            id_fichas_treino,
            nome,
            descricao,
            nivel,
            objetivo,
            duracao_treino,
            modalidade
          )
        `)
        .eq('fichas_id', fichaId)
        .order('sessao', { ascending: true });

      console.log('🔍 DEBUG: Resultado da consulta:');
      console.log('  - Erro:', fichasTreinoError);
      console.log('  - Dados brutos:', fichasTreinoData);
      console.log('  - Quantidade encontrada:', fichasTreinoData?.length || 0);

      if (fichasTreinoError) {
        throw new Error(`Erro ao buscar treinos: ${fichasTreinoError.message}`);
      }

      // 3. Formatar os dados
      const treinosValidos = fichasTreinoData?.map((item: any) => {
        const treinoFormatado = {
          id: item.treinos?.id_fichas_treino || item.treinos_id,
          nome: item.treinos?.nome || 'Treino sem nome',
          sessao: item.sessao || '',
          ficha_id: fichaInfo.id,
          ficha_treino_id: item.id,
        };
        
        console.log('🔍 DEBUG: Item processado:', {
          original: item,
          formatado: treinoFormatado
        });
        
        return treinoFormatado;
      }) || [];

      console.log('🔍 DEBUG: Treinos formatados:', treinosValidos);
      console.log('🔍 DEBUG: Quantidade de treinos:', treinosValidos.length);
      
      setTreinos(treinosValidos);

    } catch (err: any) {
      console.error('❌ Erro ao carregar dados:', err);
      setError(err.message || 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const navigateToTreino = (treino: Treino) => {
    console.log('🔍 FICHA-TREINOS - navigateToTreino chamada');
    console.log('🔍 FICHA-TREINOS - treino completo:', treino);
    console.log('🔍 FICHA-TREINOS - ID do treino:', treino.id);
    console.log('🔍 FICHA-TREINOS - tipo do ID:', typeof treino.id);
    console.log('🔍 FICHA-TREINOS - Ficha ID:', treino.ficha_id);
    console.log('🔍 FICHA-TREINOS - Sessão:', treino.sessao);
    console.log('🔍 FICHA-TREINOS - stack trace:', new Error().stack);
    
    // Verificar se o ID do treino é válido
    if (!treino.id || treino.id === 'undefined' || treino.id === 'null') {
      console.error('❌ ID do treino inválido:', treino.id);
      alert('Erro: ID do treino inválido');
      return;
    }
    
    try {
      router.push({
        pathname: '/(student)/exercicios/[id]',
        params: {
          id: treino.id,
          fichaId: String(treino.ficha_id),
          fichaTreinoId: String(treino.ficha_treino_id),
          sessao: treino.sessao,
        },
      });
      console.log('✅ Navegação iniciada com sucesso');
    } catch (error) {
      console.error('❌ Erro na navegação:', error);
      alert('Erro ao navegar para o treino');
    }
  };

  const goBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Carregando treinos...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>
          {error}
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={loadData}
        >
          <Text style={styles.buttonText}>Tentar Novamente</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkButton} onPress={goBack}>
          <Text style={[styles.linkText, { color: colors.primary }]}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Treinos
        </Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Ficha Info */}
        <View style={[styles.fichaCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.fichaTitle, { color: colors.text }]}>
            {ficha?.nome_ficha}
          </Text>
          <Text style={[styles.fichaSubtitle, { color: colors.textSecondary }]}>
            {treinos.length} treino(s) disponível(is)
          </Text>
        </View>

        {/* Lista de Treinos */}
        <View style={styles.treinosSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Seus Treinos
          </Text>

          {treinos.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Nenhum treino encontrado para esta ficha
              </Text>
            </View>
          ) : (
            treinos.map((treino, index) => (
              <TouchableOpacity
                key={treino.id}
                style={[styles.treinoCard, { backgroundColor: colors.card }]}
                onPress={() => navigateToTreino(treino)}
              >
                <View style={styles.treinoHeader}>
                  <View style={styles.treinoInfo}>
                    <Text style={[styles.treinoTitle, { color: colors.text }]}>
                      Sessão {treino.sessao}
                    </Text>
                    <Text style={[styles.treinoSubtitle, { color: colors.textSecondary }]}>
                      {treino.nome}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.playButton, { backgroundColor: colors.primary }]}
                    onPress={() => navigateToTreino(treino)}
                  >
                    <PlayCircle size={24} color="white" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  fichaCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  fichaTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    marginBottom: 4,
  },
  fichaSubtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
  },
  treinosSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    marginBottom: 16,
  },
  treinoCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  treinoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  treinoInfo: {
    flex: 1,
  },
  treinoTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
    marginBottom: 4,
  },
  treinoSubtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    textAlign: 'center',
  },
  loadingText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 12,
  },
  buttonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: 'white',
  },
  linkButton: {
    padding: 8,
  },
  linkText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
  },
});
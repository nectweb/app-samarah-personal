import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Target, TrendingUp } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

type CicloProgresso = {
  ciclo_id: string;
  ciclo_nome: string;
  data_inicio: string;
  data_fim: string;
  duracao_semanas: number;
  meta_treinos: number;
  total_checkins: number;
  faltam: number;
  percentual_conclusao: number;
  ativo: boolean;
};

export default function CycleProgressCard() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [progresso, setProgresso] = useState<CicloProgresso | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProgresso = async () => {
    if (!user) return;

    try {
      console.log('📊 Buscando progresso do ciclo ativo...');
      const { data, error } = await supabase
        .from('ciclo_progresso')
        .select('*')
        .eq('aluna_id', user.id)
        .eq('ativo', true)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        console.error('❌ Erro ao buscar progresso:', error);
        return;
      }

      if (data) {
        console.log('✅ Progresso do ciclo:', data);
        setProgresso(data);
      } else {
        console.log('ℹ️ Nenhum ciclo ativo encontrado');
        setProgresso(null);
      }
    } catch (error) {
      console.error('❌ Exceção ao buscar progresso:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgresso();
  }, [user]);

  // Recarregar quando a tela ganhar foco
  useFocusEffect(
    React.useCallback(() => {
      fetchProgresso();
    }, [user])
  );

  if (loading) {
    return null;
  }

  if (!progresso) {
    return null; // Não exibir se não houver ciclo ativo
  }

  const percentualConcluido = Math.min(
    Math.round((progresso.total_checkins / progresso.meta_treinos) * 100),
    100
  );

  // Calcular dias restantes
  const hoje = new Date();
  const dataFim = new Date(progresso.data_fim);
  const diasRestantes = Math.max(
    0,
    Math.ceil((dataFim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Target size={20} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>
            Meta do Ciclo
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[styles.badgeText, { color: colors.primary }]}>
            {diasRestantes} dias restantes
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressInfo}>
          <Text style={[styles.progressText, { color: colors.text }]}>
            {progresso.total_checkins} / {progresso.meta_treinos} treinos
          </Text>
          <Text style={[styles.percentText, { color: colors.primary }]}>
            {percentualConcluido}%
          </Text>
        </View>
        
        <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                backgroundColor: colors.primary,
                width: `${percentualConcluido}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <TrendingUp size={16} color={colors.textSecondary} />
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Faltam
          </Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {progresso.faltam} treinos
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Duração
          </Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {progresso.duracao_semanas} semanas
          </Text>
        </View>
      </View>

      {/* Cycle Name */}
      <Text style={[styles.cycleName, { color: colors.textSecondary }]}>
        {progresso.ciclo_nome}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    marginLeft: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
  },
  progressSection: {
    marginBottom: 20,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
  },
  percentText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
  },
  progressBarBg: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  divider: {
    width: 1,
    height: 40,
    marginHorizontal: 16,
  },
  statLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    marginTop: 4,
  },
  statValue: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
  },
  cycleName: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});

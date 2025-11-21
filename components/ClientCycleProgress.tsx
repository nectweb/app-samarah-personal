import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Target, TrendingUp } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

type CicloProgressoSimples = {
  ciclo_nome: string;
  meta_treinos: number;
  total_checkins: number;
  faltam: number;
  percentual_conclusao: number;
};

type Props = {
  alunaId: string;
};

export default function ClientCycleProgress({ alunaId }: Props) {
  const { colors } = useTheme();
  const [progresso, setProgresso] = useState<CicloProgressoSimples | null>(null);

  useEffect(() => {
    fetchProgresso();
  }, [alunaId]);

  const fetchProgresso = async () => {
    try {
      const { data, error } = await supabase
        .from('ciclo_progresso')
        .select('ciclo_nome, meta_treinos, total_checkins, faltam, percentual_conclusao')
        .eq('aluna_id', alunaId)
        .eq('ativo', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar progresso:', error);
        return;
      }

      setProgresso(data);
    } catch (error) {
      console.error('Exceção ao buscar progresso:', error);
    }
  };

  if (!progresso) {
    return null;
  }

  const percentual = Math.min(Math.round(progresso.percentual_conclusao || 0), 100);
  const getStatusColor = () => {
    if (percentual >= 80) return '#10B981';
    if (percentual >= 50) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Target size={18} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>
            Meta do Ciclo Atual
          </Text>
        </View>
        <Text style={[styles.cycleName, { color: colors.textSecondary }]}>
          {progresso.ciclo_nome}
        </Text>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressInfo}>
          <Text style={[styles.progressText, { color: colors.text }]}>
            {progresso.total_checkins} / {progresso.meta_treinos} treinos
          </Text>
          <Text style={[styles.percentText, { color: getStatusColor() }]}>
            {percentual}%
          </Text>
        </View>
        
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: getStatusColor(),
                width: `${percentual}%`,
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <TrendingUp size={14} color={colors.textSecondary} />
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Faltam {progresso.faltam} treinos
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
  },
  cycleName: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
  },
  progressSection: {
    marginBottom: 12,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
  },
  percentText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
  },
});

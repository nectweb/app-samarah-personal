import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Check, X, Calendar } from 'lucide-react-native';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

type DayStatus = 'completed' | 'missed' | 'future';

type WeekDay = {
  id: number;
  name: string;
  shortName: string;
  status: DayStatus;
  date: Date;
};

export default function WeeklyWorkoutCard() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [weekDays, setWeekDays] = useState<WeekDay[]>([]);

  // Initialize week days
  useEffect(() => {
    const fetchFrequencia = async () => {
      if (!user) return;

      const today = new Date();
      const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, ...
      const days: WeekDay[] = [];

      // Ajusta para começar na segunda-feira (0 = Monday, 6 = Sunday)
      const adjustedCurrentDay = currentDay === 0 ? 6 : currentDay - 1;


      
      // Busca dados de frequência do banco para a semana atual
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - adjustedCurrentDay);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      let frequenciaData: any[] = [];
      try {
        console.log('📅 Buscando treinos concluídos da semana...');
        const { data, error } = await supabase
          .from('treino_concluido')
          .select('*')
          .eq('aluna_id', user.id)
          .eq('concluido', true)
          .gte('data_conclusao', startOfWeek.toISOString().split('T')[0])
          .lte('data_conclusao', endOfWeek.toISOString().split('T')[0]);

        if (error) {
          console.error('❌ Erro ao buscar treinos concluídos:', error);
          frequenciaData = [];
        } else {
          frequenciaData = data || [];
          console.log('✅ Treinos concluídos encontrados:', frequenciaData.length);
        }
      } catch (error) {
        console.error('❌ Exceção ao buscar frequência:', error);
        frequenciaData = [];
      }

      // Cria array de dias com status apropriado
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - adjustedCurrentDay + i);

        let status: DayStatus;
        const isToday = date.toDateString() === today.toDateString();
        const isPastDay = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());

        // Verifica se tem algum treino concluído neste dia
        const dateStr = date.toISOString().split('T')[0];
        const treinoConcluido = frequenciaData?.some(f => f.data_conclusao === dateStr);

        if (treinoConcluido) {
          status = 'completed';
        } else if (isPastDay) {
          status = 'missed';
        } else {
          status = 'future';
        }

        days.push({
          id: i,
          name: getDayName(i),
          shortName: getDayShortName(i),
          status,
          date,
        });
      }

      setWeekDays(days);
    };

    fetchFrequencia();
  }, [user]);

  // Recarregar quando a tela ganhar foco (útil quando voltar da tela de exercícios)
  useFocusEffect(
    React.useCallback(() => {
      const fetchFrequencia = async () => {
        if (!user) return;

        const today = new Date();
        const currentDay = today.getDay();
        const adjustedCurrentDay = currentDay === 0 ? 6 : currentDay - 1;

        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - adjustedCurrentDay);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        try {
          console.log('🔄 Recarregando treinos concluídos...');
          const { data, error } = await supabase
            .from('treino_concluido')
            .select('*')
            .eq('aluna_id', user.id)
            .eq('concluido', true)
            .gte('data_conclusao', startOfWeek.toISOString().split('T')[0])
            .lte('data_conclusao', endOfWeek.toISOString().split('T')[0]);

          if (error) {
            console.error('❌ Erro ao recarregar:', error);
            return;
          }

          const frequenciaData = data || [];
          const days: WeekDay[] = [];

          for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - adjustedCurrentDay + i);

            const isPastDay = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const dateStr = date.toISOString().split('T')[0];
            const treinoConcluido = frequenciaData?.some(f => f.data_conclusao === dateStr);

            let status: DayStatus;
            if (treinoConcluido) {
              status = 'completed';
            } else if (isPastDay) {
              status = 'missed';
            } else {
              status = 'future';
            }

            days.push({
              id: i,
              name: getDayName(i),
              shortName: getDayShortName(i),
              status,
              date,
            });
          }

          setWeekDays(days);
          console.log('✅ Semana atualizada!');
        } catch (error) {
          console.error('❌ Erro ao atualizar semana:', error);
        }
      };

      fetchFrequencia();
    }, [user])
  );

  // Get full day name
  const getDayName = (dayIndex: number): string => {
    const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
    return days[dayIndex];
  };

  // Get short day name
  const getDayShortName = (dayIndex: number): string => {
    const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    return days[dayIndex];
  };

  // Calculate completed workouts
  const today = new Date();
  const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, ...
  const adjustedCurrentDay = currentDay === 0 ? 6 : currentDay - 1; // Ajusta para começar na segunda-feira
  const completedWorkouts = weekDays
    .filter(day => day.status === 'completed')
    .length;
  const totalDaysUntilToday = Math.min(adjustedCurrentDay + 1, 7);

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={[styles.header, { flexDirection: 'column', alignItems: 'flex-start' }]}>
        <View style={styles.titleContainer}>
          <Calendar size={20} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>Frequência Semanal</Text>
        </View>
        <Text style={[styles.summary, { color: colors.textSecondary, marginTop: 8 }]}>
          {completedWorkouts}/{totalDaysUntilToday} treinos realizados
        </Text>
      </View>

      <View style={styles.daysContainer}>
        {weekDays.map((day) => (
          <View
            key={day.id}
            style={styles.dayItem}
          >
            <View 
              style={[
                styles.dayCircle,
                { 
                  backgroundColor: getStatusColor(day.status, colors),
                }
              ]}
            >
              {day.status === 'completed' && <Check size={16} color="white" />}
              {day.status === 'missed' && <X size={16} color="white" />}
            </View>
            <Text style={[styles.dayText, { color: colors.text }]}>
              {Platform.OS === 'web' ? day.name : day.shortName}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// Helper function to get color based on status
function getStatusColor(status: DayStatus, colors: any): string {
  switch (status) {
    case 'completed':
      return `${colors.primary}80`; // Use theme primary color with 50% opacity (80 in hex)
    case 'missed':
      return (colors.error || '#EF4444') + 'B3'; // Use theme error color with 70% opacity (B3 in hex)
    case 'future':
    default:
      return `${colors.border}80`; // Gray with 50% opacity
  }
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  summary: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayItem: {
    alignItems: 'center',
    width: Platform.OS === 'web' ? 70 : 40,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
  },
});
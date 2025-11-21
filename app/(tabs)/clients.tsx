import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Pressable, ActivityIndicator, Animated } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/context/ThemeContext';
import { Search, Plus, Filter, MoveVertical as MoreVertical, Phone, Mail, Instagram, Calendar, Award, User, ChevronDown, Check, X } from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

type Client = {
  user_id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  foto: string | null;
  ativo: boolean | null;
  instagram: string | null;
};

type DayStatus = 'completed' | 'missed' | 'future';

type WeekDay = {
  id: number;
  name: string;
  shortName: string;
  status: DayStatus;
  date: Date;
};

type WeeklyWorkoutCardForClientProps = {
  userId: string;
};

// Componente para exibir a frequência semanal de treinos para cada aluna
const WeeklyWorkoutCardForClient = ({ userId }: WeeklyWorkoutCardForClientProps) => {
  const { colors } = useTheme();
  const [weekDays, setWeekDays] = useState<WeekDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [scaleAnims] = useState<Animated.Value[]>(
    Array(7).fill(0).map(() => new Animated.Value(1))
  );

  // Initialize week days
  useEffect(() => {
    const fetchFrequencia = async () => {
      if (!userId) return;

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

      let frequenciaData = [];
      try {
        const { data, error } = await supabase
          .from('view_frequencia_semanal')
          .select('*')
          .eq('aluna_id', userId)
          .gte('data_dia', startOfWeek.toISOString().split('T')[0])
          .lte('data_dia', endOfWeek.toISOString().split('T')[0])
          .order('data_dia', { ascending: true });

        // Se não houver erro e data existir, mesmo que vazio, use-o
        frequenciaData = data || [];
      } catch (error) {
        console.error('Erro ao buscar frequência:', error);
        // Em caso de erro, continua com array vazio
        frequenciaData = [];
      }

      // Cria array de dias com status apropriado
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - adjustedCurrentDay + i);

        let status: DayStatus;
        const isToday = date.toDateString() === today.toDateString();
        const isPastDay = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());

        // Procura o dia correspondente nos dados de frequência
        const frequenciaDia = frequenciaData?.find(f => {
          const dataFreq = new Date(f.data_dia);
          return dataFreq.toDateString() === date.toDateString();
        });

        if (frequenciaDia?.treino_concluido) {
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
      setLoading(false);
    };

    fetchFrequencia();
  }, [userId]);

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

  if (loading) {
    return (
      <View style={styles.frequencyContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.frequencyContainer}>
      <View style={styles.frequencyHeader}>
        <Calendar size={16} color={colors.primary} />
        <Text style={[styles.frequencyTitle, { color: colors.text }]}>Frequência Semanal</Text>
      </View>
      <Text style={[styles.frequencySummary, { color: colors.textSecondary }]}>
        {completedWorkouts}/{totalDaysUntilToday} treinos realizados
      </Text>
      <View style={styles.daysContainer}>
        {weekDays.map((day) => (
          <View key={day.id} style={styles.dayItem}>
            <View 
              style={[
                styles.dayCircle,
                { backgroundColor: getStatusColor(day.status, colors) }
              ]}
            >
              {day.status === 'completed' && <Check size={12} color="white" />}
              {day.status === 'missed' && <X size={12} color="white" />}
            </View>
            <Text style={[styles.dayText, { color: colors.textSecondary }]}>
              {day.shortName}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// Helper function to get color based on status
function getStatusColor(status: DayStatus, colors: any): string {
  switch (status) {
    case 'completed':
      return colors.primary;
    case 'missed':
      return colors.error || '#EF4444';
    case 'future':
    default:
      return colors.border;
  }
}

export default function ClientsScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const animatedValues = useRef<{[key: string]: Animated.Value}>({});

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('admin', false)
        .order('nome', { ascending: true });

      if (error) throw error;

      setClients(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar alunas');
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client => 
    client.nome?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleExpand = (id: string) => {
    // Inicializa o valor animado se ainda não existir
    if (!animatedValues.current[id]) {
      animatedValues.current[id] = new Animated.Value(0);
    }
    
    // Anima a expansão/contração
    Animated.timing(animatedValues.current[id], {
      toValue: expandedClient === id ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
    
    setExpandedClient(expandedClient === id ? null : id);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
      </View>
    );
  }

  const renderClientItem = ({ item }: { item: Client }) => {
    const isExpanded = expandedClient === item.user_id;
    
    // Inicializa o valor animado se ainda não existir
    if (!animatedValues.current[item.user_id]) {
      animatedValues.current[item.user_id] = new Animated.Value(isExpanded ? 1 : 0);
    }
    
    // Calcula a altura do conteúdo expandido com base no valor animado
    const expandHeight = animatedValues.current[item.user_id].interpolate({
      inputRange: [0, 1],
      outputRange: [0, 300], // Aumentado para melhor acomodar os botões
    });
    
    // Calcula a rotação do ícone com base no valor animado
    const iconRotation = animatedValues.current[item.user_id].interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '180deg'],
    });
    
    return (
      <Animated.View 
        style={[
          styles.clientCard, 
          { 
            backgroundColor: colors.card,
            shadowColor: colors.text,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
            transform: [{ scale: isExpanded ? 1.02 : 1 }],
          }
        ]}
      >
        <Pressable 
          style={styles.clientCardHeader}
          onPress={() => toggleExpand(item.user_id)}
          android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
        >
          <View style={styles.clientImageContainer}>
            <Image
              source={item.foto || 'https://via.placeholder.com/200'}
              style={styles.clientImage}
              transition={300}
              contentFit="cover"
            />
          </View>
          
          <View style={styles.clientInfo}>
            <Text style={[styles.clientName, { color: colors.text }]}>{item.nome || 'Sem nome'}</Text>
            <View style={styles.clientMetaInfo}>
              <Calendar size={12} color={colors.textSecondary} style={styles.metaIcon} />
              <Text style={[styles.createdAtText, { color: colors.textSecondary }]}>
                {new Date(item.created_at).toLocaleDateString('pt-BR')}
              </Text>
            </View>
          </View>
          
          <View style={styles.clientActions}>
            <View style={[
              styles.statusBadge, 
              { 
                backgroundColor: item.ativo 
                  ? 'rgba(16, 185, 129, 0.1)' 
                  : 'rgba(239, 68, 68, 0.1)' 
              }
            ]}>
              <Text style={[
                styles.statusText, 
                { 
                  color: item.ativo 
                    ? '#10B981' 
                    : '#EF4444' 
                }
              ]}>
                {item.ativo ? 'Ativa' : 'Inativa'}
              </Text>
            </View>
            <Animated.View style={{ transform: [{ rotate: iconRotation }] }}>
              <ChevronDown size={20} color={colors.textSecondary} />
            </Animated.View>
          </View>
        </Pressable>
        
        <Animated.View 
          style={[
            styles.expandedContentContainer,
            { height: expandHeight, opacity: animatedValues.current[item.user_id] }
          ]}
        >
          {isExpanded && (
            <View style={styles.expandedContent}>
              <View style={styles.contactInfoSection}>
                <View style={styles.contactItem}>
                  <Mail size={16} color={colors.primary} />
                  <Text style={[styles.contactText, { color: colors.text }]}>{item.email || 'Email não cadastrado'}</Text>
                </View>
                <View style={styles.contactItem}>
                  <Phone size={16} color={colors.primary} />
                  <Text style={[styles.contactText, { color: colors.text }]}>{item.telefone || 'Telefone não cadastrado'}</Text>
                </View>
                {item.instagram && (
                  <View style={styles.contactItem}>
                    <Instagram size={16} color={colors.primary} />
                    <Text style={[styles.contactText, { color: colors.text }]}>@{item.instagram}</Text>
                  </View>
                )}
              </View>
              
              {/* Componente de Frequência Semanal */}
              <WeeklyWorkoutCardForClient userId={item.user_id} />
              
              <View style={styles.expandedActions}>
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: colors.primary }]}
                  onPress={() => router.push(`/client-details/${item.user_id}`)}
                >
                  <User size={14} color="white" style={{ marginRight: 6 }} />
                  <Text style={styles.actionButtonText}>Ver Perfil</Text>
                </TouchableOpacity>
                
              </View>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Minhas Alunas</Text>
        
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchInputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search size={20} color={colors.primary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar por nome, email ou telefone..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <View style={styles.clearButton}>
                <Text style={styles.clearButtonText}>×</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: colors.card }]}>
          <Text style={[styles.statNumber, { color: colors.text }]}>{clients.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.card }]}>
          <Text style={[styles.statNumber, { color: colors.text }]}>
            {clients.filter(c => c.ativo).length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Ativas</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.card }]}>
          <Text style={[styles.statNumber, { color: colors.text }]}>
            {clients.filter(c => !c.ativo).length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Inativas</Text>
        </View>
      </View>

      <FlatList
        data={filteredClients}
        renderItem={renderClientItem}
        keyExtractor={item => item.user_id}
        contentContainerStyle={styles.clientsList}
        showsVerticalScrollIndicator={false}
      />
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
  errorText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
  },
  clearButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 20,
    textAlign: 'center',
  },
  filterButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
  },
  statLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
  },
  clientsList: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  clientCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  clientCardHeader: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  clientImageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  clientImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(236, 72, 153, 0.3)',
  },

  clientInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  clientMetaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  metaIcon: {
    marginRight: 4,
  },
  clientName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    marginBottom: 2,
  },
  createdAtText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
  },
  clientActions: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  statusText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
  },
  expandedContentContainer: {
    overflow: 'hidden',
  },
  expandedContent: {
    padding: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  contactInfoSection: {
    marginBottom: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    marginLeft: 8,
  },
  expandedActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  actionButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: 'white',
  },
  // Estilos para o componente de frequência
  frequencyContainer: {
    marginVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 12,
    padding: 12,
  },
  frequencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  frequencyTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    marginLeft: 6,
  },
  frequencySummary: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    marginBottom: 10,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayItem: {
    alignItems: 'center',
    width: 32,
  },
  dayCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  dayText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 10,
  },
});
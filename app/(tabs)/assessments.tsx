import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Search, Calendar, Clock, XCircle, Ruler } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Image } from 'react-native';

// Sample data for the progress charts
const weightData = {
  labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai'],
  datasets: [{
    data: [75, 74, 72.5, 71.8, 70.2],
  }],
};

const measurementsData = {
  labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai'],
  datasets: [{
    data: [95, 93, 91, 89, 88],
  }],
};

const strengthData = {
  labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai'],
  datasets: [{
    data: [30, 35, 40, 45, 50],
  }],
};

interface Student {
  user_id: string;
  nome: string;
  foto: string;
  medidas?: {
    id: string;
    data_medicao: string;
    data_prox_medicao: string | null;
    peso: number;
    torax: number;
    cintura: number;
    abdomen: number;
    quadril: number;
    coxa_medial: number;
    panturrilha: number;
  };
}

export default function AssessmentsScreen() {
  const { colors } = useTheme();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  async function fetchStudents() {
    try {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('tipo', 'aluno')
        .eq('admin', false);

      if (usersError) throw usersError;

      const studentsWithMeasurements = await Promise.all(
        users.map(async (user) => {
          const { data: medidas, error: medidasError } = await supabase
            .from('medidas_corporais')
            .select('*')
            .eq('aluna_id', user.user_id)
            .order('data_medicao', { ascending: false })
            .limit(1);

          if (medidasError) throw medidasError;

          return {
            ...user,
            medidas: medidas?.[0],
          };
        })
      );

      setStudents(studentsWithMeasurements);
    } catch (error) {
      console.error('Erro ao buscar alunas:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleCardPress = (studentId: string) => {
    router.push(`/assessment/${studentId}`);
  };

  const filteredStudents = students
    .sort((a, b) => {
      if (a.medidas && !b.medidas) return -1;
      if (!a.medidas && b.medidas) return 1;
      return a.nome.localeCompare(b.nome);
    })
    .filter(student => 
      student.nome?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  // Função para formatar data
  const formatarData = (dataString: string | null) => {
    if (!dataString) return null;
    try {
      const data = parseISO(dataString);
      return format(data, 'dd/MM/yyyy', { locale: pt });
    } catch (error) {
      return 'Data inválida';
    }
  };

  // Componente de card de estudante personalizado
  const StudentCardCustom = ({ student, index }: { student: Student, index: number }) => {
    const hasMeasurements = !!student.medidas;
    const ultimaMedicao = hasMeasurements && student.medidas ? formatarData(student.medidas.data_medicao) : null;
    const proximaMedicao = hasMeasurements && student.medidas && student.medidas.data_prox_medicao ? 
      formatarData(student.medidas.data_prox_medicao) : null;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderLeftWidth: 4,
            borderLeftColor: hasMeasurements ? '#10B981' : '#EF4444',
          },
          !hasMeasurements && styles.disabledCard
        ]}
        onPress={() => hasMeasurements && handleCardPress(student.user_id)}
        disabled={!hasMeasurements}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: student.foto || 'https://via.placeholder.com/200' }}
          style={styles.avatar}
        />
        <View style={styles.cardContent}>
          <Text style={[styles.name, { color: colors.text }]}>
            {student.nome}
          </Text>

          {hasMeasurements ? (
            <>
              <View style={styles.assessmentRow}>
                <Calendar size={14} color={colors.primary} />
                <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                  Última medição: {ultimaMedicao}
                </Text>
              </View>
              <View style={styles.assessmentRow}>
                <Clock size={14} color={colors.primary} />
                <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                  Próxima medição: {proximaMedicao || "..."}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.assessmentRow}>
              <XCircle size={14} color="#EF4444" />
              <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                Sem medições
              </Text>
            </View>
          )}

          {hasMeasurements && student.medidas && (
            <View style={styles.measurements}>
              <View style={styles.measurementItem}>
                <Text style={[styles.measurementLabel, { color: colors.textSecondary }]}>Peso</Text>
                <Text style={[styles.measurementValue, { color: colors.text }]}>{student.medidas.peso} kg</Text>
              </View>
              <View style={styles.measurementItem}>
                <Text style={[styles.measurementLabel, { color: colors.textSecondary }]}>Cintura</Text>
                <Text style={[styles.measurementValue, { color: colors.text }]}>{student.medidas.cintura} cm</Text>
              </View>
              <View style={styles.measurementItem}>
                <Text style={[styles.measurementLabel, { color: colors.textSecondary }]}>Quadril</Text>
                <Text style={[styles.measurementValue, { color: colors.text }]}>{student.medidas.quadril} cm</Text>
              </View>
            </View>
          )}
        </View>

        {hasMeasurements && (
          <View style={styles.statusBadge}>
            <Ruler size={16} color="#10B981" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header]}>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.text }]}>Avaliações</Text>
        </View>
      </View>


      <View style={styles.searchContainer}>
        <View style={[styles.searchInputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search size={20} color={colors.primary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar aluna por nome..."
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

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Lista de Alunas</Text>
      </View>

      <View style={styles.grid}>
        {loading ? (
          <Text style={[styles.loadingText, { color: colors.text }]}>Carregando...</Text>
        ) : filteredStudents.map((student, index) => (
          <StudentCardCustom 
            key={student.user_id}
            student={student}
            index={index}
          />
        ))}
      </View>
      
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingText: {
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    marginTop: 20,
  },
  anamneseButton: {
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  anamneseButtonText: {
    color: 'white',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
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
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerIcon: {
    marginRight: 10,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 28,
  },
  subtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    marginBottom: 10,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  summaryCard: {
    width: '30%',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EC4899',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  summaryValue: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    textAlign: 'center',
  },
  summaryLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    textAlign: 'center',
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
  },
  grid: {
    padding: 16,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    flex: 1,
  },
  disabledCard: {
    opacity: 0.6,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  name: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    marginBottom: 4,
  },
  assessmentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assessmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  statusText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
  },
  statusBadge: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -12,
  },
  contentContainer: {
    flex: 1,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
  },
  chartContainer: {
    alignItems: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  measurements: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  measurementItem: {
    alignItems: 'center',
  },
  measurementLabel: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    marginBottom: 2,
  },
  measurementValue: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
  },
  bottomPadding: {
    height: 100
  }
});
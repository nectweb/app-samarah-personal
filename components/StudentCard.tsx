import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, Animated } from 'react-native';
import { Calendar, Ruler, XCircle } from 'lucide-react-native';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StudentCardProps {
  student: {
    user_id: string;
    nome: string;
    foto: string;
    medidas?: {
      data_medicao: string;
      peso: number;
      torax: number;
      cintura: number;
      abdomen: number;
      quadril: number;
      coxa_medial: number;
      panturrilha: number;
    };
  };
  index: number;
  colors: any;
  styles: any;
  onPress: (studentId: string) => void;
}

export default function StudentCard({ student, index, colors, styles, onPress }: StudentCardProps) {
  const hasMeasurements = !!student.medidas;
  const formattedDate = hasMeasurements
    ? format(new Date(student.medidas.data_medicao), "dd 'de' MMMM, yyyy", { locale: ptBR })
    : null;

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
      onPress={() => hasMeasurements && onPress(student.user_id)}
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

        <View style={styles.assessmentStatus}>
          {hasMeasurements ? (
            <>
              <Calendar size={14} color={colors.primary} />
              <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                Última medição: {formattedDate}
              </Text>
            </>
          ) : (
            <>
              <XCircle size={14} color="#EF4444" />
              <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                Sem medições
              </Text>
            </>
          )}
        </View>

        {hasMeasurements && (
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
}
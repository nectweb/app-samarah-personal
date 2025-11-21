import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { AlertCircle } from 'lucide-react-native';

interface StatCardProps {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
  loading?: boolean;
  error?: string | null;
  backgroundColor: string;
  textColor: string;
  secondaryTextColor: string;
  style?: object; // Estilo adicional para customização
}

/**
 * Componente de cartão de estatística reutilizável para o dashboard
 * 
 * Exibe um ícone, valor e rótulo, com estados de carregamento e erro
 */
export default function StatCard({
  icon,
  value,
  label,
  loading = false,
  error = null,
  backgroundColor,
  textColor,
  secondaryTextColor,
  style = {}
}: StatCardProps) {
  return (
    <View style={[styles.statCard, { backgroundColor }, style]}>
      {icon}
      
      {loading ? (
        <ActivityIndicator size="small" color={secondaryTextColor} style={styles.loader} />
      ) : error ? (
        <View style={styles.errorContainer}>
          <AlertCircle size={16} color="#EF4444" />
          <Text style={[styles.errorText, { color: '#EF4444' }]}>Erro</Text>
        </View>
      ) : (
        <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
      )}
      
      <Text style={[styles.statLabel, { color: secondaryTextColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  statValue: {
    fontFamily: 'Poppins-Bold',
    fontSize: 32,
    marginTop: 8,
  },
  statLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
  },
  loader: {
    marginTop: 12,
    marginBottom: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  errorText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    marginLeft: 4,
  }
}); 
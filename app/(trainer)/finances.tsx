import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { DollarSign, TrendingUp, TrendingDown, Clock } from 'lucide-react-native';

export default function FinancesScreen() {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 16,
    },
    header: {
      marginBottom: 24,
    },
    title: {
      fontSize: 24,
      fontFamily: 'Poppins-Bold',
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      fontFamily: 'Poppins-Regular',
      color: colors.textSecondary,
    },
    cardsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: 24,
    },
    card: {
      width: '48%',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    cardIcon: {
      backgroundColor: colors.primary + '20',
      padding: 8,
      borderRadius: 8,
      alignSelf: 'flex-start',
      marginBottom: 12,
    },
    cardTitle: {
      fontSize: 12,
      fontFamily: 'Poppins-Medium',
      color: colors.textSecondary,
      marginBottom: 4,
    },
    cardValue: {
      fontSize: 20,
      fontFamily: 'Poppins-Bold',
      color: colors.text,
    },
    section: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontFamily: 'Poppins-Bold',
      color: colors.text,
      marginBottom: 16,
    },
    transactionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    transactionInfo: {
      flex: 1,
    },
    transactionTitle: {
      fontSize: 14,
      fontFamily: 'Poppins-Medium',
      color: colors.text,
    },
    transactionDate: {
      fontSize: 12,
      fontFamily: 'Poppins-Regular',
      color: colors.textSecondary,
    },
    transactionValue: {
      fontSize: 14,
      fontFamily: 'Poppins-Bold',
    },
    positive: {
      color: '#10B981',
    },
    negative: {
      color: '#EF4444',
    },
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Financeiro</Text>
        <Text style={styles.subtitle}>Visão geral das suas finanças</Text>
      </View>

      <View style={styles.cardsContainer}>
        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <DollarSign size={24} color={colors.primary} />
          </View>
          <Text style={styles.cardTitle}>Receita Total</Text>
          <Text style={styles.cardValue}>R$ 5.200,00</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <TrendingUp size={24} color={colors.primary} />
          </View>
          <Text style={styles.cardTitle}>Recebido</Text>
          <Text style={styles.cardValue}>R$ 4.800,00</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <TrendingDown size={24} color={colors.primary} />
          </View>
          <Text style={styles.cardTitle}>A Receber</Text>
          <Text style={styles.cardValue}>R$ 400,00</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <Clock size={24} color={colors.primary} />
          </View>
          <Text style={styles.cardTitle}>Atrasados</Text>
          <Text style={styles.cardValue}>R$ 200,00</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Últimas Transações</Text>
        
        <View style={styles.transactionItem}>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionTitle}>Maria Silva</Text>
            <Text style={styles.transactionDate}>15 Nov 2023</Text>
          </View>
          <Text style={[styles.transactionValue, styles.positive]}>+ R$ 150,00</Text>
        </View>

        <View style={styles.transactionItem}>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionTitle}>Ana Paula</Text>
            <Text style={styles.transactionDate}>14 Nov 2023</Text>
          </View>
          <Text style={[styles.transactionValue, styles.positive]}>+ R$ 150,00</Text>
        </View>

        <View style={styles.transactionItem}>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionTitle}>Carla Santos</Text>
            <Text style={styles.transactionDate}>13 Nov 2023</Text>
          </View>
          <Text style={[styles.transactionValue, styles.negative]}>- R$ 150,00</Text>
        </View>
      </View>
    </ScrollView>
  );
}
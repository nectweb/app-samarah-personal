import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/context/ThemeContext';
import { Calendar, ChevronRight } from 'lucide-react-native';

type ClientProgressCardProps = {
  name: string;
  progress: number;
  image: string;
  lastSession: string;
  nextSession: string;
};

export default function ClientProgressCard({ name, progress, image, lastSession, nextSession }: ClientProgressCardProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <Image
          source={image}
          style={styles.image}
        />
        <View style={styles.progressCircle}>
          <Text style={styles.progressText}>{progress}%</Text>
        </View>
      </View>
      
      <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
      
      <View style={styles.sessionInfo}>
        <View style={styles.sessionItem}>
          <Text style={[styles.sessionLabel, { color: colors.textSecondary }]}>Último treino:</Text>
          <Text style={[styles.sessionValue, { color: colors.text }]}>{lastSession}</Text>
        </View>
        
        <View style={styles.sessionItem}>
          <Text style={[styles.sessionLabel, { color: colors.textSecondary }]}>Próximo treino:</Text>
          <Text style={[styles.sessionValue, { color: colors.text }]}>{nextSession}</Text>
        </View>
      </View>
      
      <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]}>
        <Text style={styles.buttonText}>Ver Perfil</Text>
        <ChevronRight size={16} color="white" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 200,
    borderRadius: 16,
    padding: 16,
    marginRight: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 12,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  progressCircle: {
    position: 'absolute',
    bottom: -5,
    right: 50,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EC4899',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    color: 'white',
    fontFamily: 'Poppins-Bold',
    fontSize: 12,
  },
  name: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
  },
  sessionInfo: {
    marginBottom: 16,
  },
  sessionItem: {
    marginBottom: 8,
  },
  sessionLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
  },
  sessionValue: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: 'white',
    marginRight: 4,
  },
});
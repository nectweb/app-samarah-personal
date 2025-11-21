import React from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Mod from './(student)/workout-exercises';

// Defensive wrapper: ensure the imported module has a usable component before rendering.
export default function WorkoutExercisesRoot() {
  const { treino_id } = useLocalSearchParams<{ treino_id: string }>();
  
  // Logs detalhados para rastrear o problema
  console.log('🔍 WORKOUT-EXERCISES-ROOT - Componente renderizado');
  console.log('🔍 WORKOUT-EXERCISES-ROOT - treino_id recebido:', treino_id);
  console.log('🔍 WORKOUT-EXERCISES-ROOT - tipo do treino_id:', typeof treino_id);
  console.log('🔍 WORKOUT-EXERCISES-ROOT - stack trace:', new Error().stack);
  
  // Log module contents to help diagnose why default might be undefined
  console.log('app/workout-exercises.tsx importing module:', Mod);

  const Comp = (Mod &&
    (Mod.default || Mod.WorkoutExercisesScreen || Mod)) as any;

  if (!Comp) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        }}
      >
        <Text style={{ color: 'red', textAlign: 'center' }}>
          Componente de treino não encontrado. Veja o console para detalhes.
        </Text>
      </View>
    );
  }

  return React.createElement(Comp);
}

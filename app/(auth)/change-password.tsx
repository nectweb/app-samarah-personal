import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Lock, ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';

export default function ChangePasswordScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Erro', 'A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Erro', 'A nova senha e a confirmação não coincidem.');
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Para alterar a senha, primeiro verificamos a senha atual
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      });

      if (signInError) {
        Alert.alert('Erro', 'Senha atual incorreta.');
        setIsLoading(false);
        return;
      }

      // Se a senha atual estiver correta, alteramos para a nova senha
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      Alert.alert(
        'Sucesso', 
        'Sua senha foi alterada com sucesso!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      Alert.alert('Erro', 'Não foi possível alterar sua senha. Tente novamente mais tarde.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Alterar Senha</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Atualize sua senha de acesso
          </Text>

          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Lock size={20} color={colors.primary} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Senha atual"
              placeholderTextColor={colors.textSecondary}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              autoComplete="password"
            />
          </View>

          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Lock size={20} color={colors.primary} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Nova senha"
              placeholderTextColor={colors.textSecondary}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoComplete="password-new"
            />
          </View>

          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Lock size={20} color={colors.primary} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Confirmar nova senha"
              placeholderTextColor={colors.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="password-new"
            />
          </View>

          <TouchableOpacity 
            style={[styles.changeButton, isLoading && styles.disabledButton]} 
            onPress={handleChangePassword}
            disabled={isLoading}
          >
            <LinearGradient
              colors={['#EC4899', '#D946EF']}
              style={styles.gradientButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.changeButtonText}>
                {isLoading ? 'Atualizando...' : 'Alterar Senha'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
  },
  formContainer: {
    paddingHorizontal: 20,
  },
  subtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    height: '100%',
    marginLeft: 12,
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
  },
  changeButton: {
    height: 56,
    borderRadius: 12,
    marginTop: 24,
    overflow: 'hidden',
  },
  disabledButton: {
    opacity: 0.7,
  },
  gradientButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeButtonText: {
    color: 'white',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
  },
}); 
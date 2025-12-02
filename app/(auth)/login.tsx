import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock, Mail } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { theme, colors } = useTheme();
  const { signIn } = useAuth();

  const handleLogin = async () => {
    try {
      if (!email || !password) {
        setError('Por favor, preencha todos os campos');
        return;
      }
      
      await signIn(email, password);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      
      if (errorMessage.includes('Invalid login credentials')) {
        setError('Email ou senha incorretos. Por favor, verifique suas credenciais.');
      } else if (errorMessage.includes('User not found')) {
        setError('Usuário não encontrado. Verifique seu email ou registre uma nova conta.');
      } else if (errorMessage.includes('Email not confirmed')) {
        setError('Email não confirmado. Por favor, verifique sua caixa de entrada.');
      } else {
        setError('Falha ao fazer login. Por favor, tente novamente.');
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ backgroundColor: colors.background, alignItems: 'center', paddingTop: 64, paddingBottom: 40 }}>
          <View style={{
            width: 270,
            height: 200,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 10,
            overflow: 'hidden'
          }}>
            <Image
              source={require('@/assets/logo_login.png')}
              style={{ width: 290, height: '100%', resizeMode: 'cover' }}
            />
          </View>
        </View>

        <View style={[styles.formContainer, { backgroundColor: colors.background }]}>
          <Text style={[styles.welcomeText, { color: colors.text }]}>Bem-vinda de volta!</Text>
          <Text style={[styles.subtitleText, { color: colors.textSecondary }]}>
            Faça login para continuar
          </Text>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Mail size={20} color={colors.primary} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Email"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Lock size={20} color={colors.primary} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Senha"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />
          </View>

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>
              Esqueceu a senha?
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <LinearGradient
              colors={['#EC4899', '#D946EF']}
              style={styles.gradientButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.loginButtonText}>Entrar</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.registerContainer}>
            <Text style={[styles.registerText, { color: colors.textSecondary }]}>
              Não tem uma conta?
            </Text>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={[styles.registerLink, { color: colors.primary }]}>
                {' '}Registre-se
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  headerGradient: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 32,
    color: 'white',
    letterSpacing: 1,
  },
  logoSubtext: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: 'white',
    letterSpacing: 2,
  },
  formContainer: {
    flex: 1,
    marginTop: -30,
    paddingHorizontal: 24,
    paddingTop: 30,
  },
  welcomeText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    marginBottom: 8,
    textAlign: "center"
  },
  subtitleText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    marginBottom: 30,
    textAlign: "center"
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: 'Poppins-Regular',
    color: '#D32F2F',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 56,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
  },
  loginButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  gradientButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
  },
  loginButtonText: {
    fontFamily: 'Poppins-Bold',
    color: 'white',
    fontSize: 16,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  registerText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
  },
  registerLink: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
  },
});
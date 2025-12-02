import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock, Mail, User, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { theme, colors } = useTheme();

  const handleRegister = async () => {
    // Validação básica dos campos
    if (!name || !email || !password || !confirmPassword) {
      setError('Preencha todos os campos');
      return;
    }

    if (password !== confirmPassword) {
      setError('Senhas não coincidem');
      return;
    }

    try {
      // Registro no Supabase Auth
      const {
        data: { user },
        error,
      } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
        },
      });

      if (error) {
        console.error('Erro no auth.signUp:', error);
        throw error;
      }

      // Verificar se o user foi criado corretamente
      if (!user || !user.id) {
        console.error('User ou user.id é null/undefined:', { user });
        throw new Error('Falha ao criar usuário - ID não disponível');
      }

      console.log('Usuário criado no Auth:', {
        id: user.id,
        email: user.email,
      });

      // Usar upsert para inserir ou atualizar o usuário na tabela users
      const insertData = {
        user_id: user.id, // ID do usuário criado em auth.users
        nome: name,
        email: email,
        ativo: true,
        tipo: 'aluno',
      };

      console.log('Dados para upsert na tabela users:', insertData);

      const { data: insertedData, error: insertError } = await supabase
        .from('users')
        .upsert(insertData, {
          onConflict: 'user_id',
          ignoreDuplicates: false,
        })
        .select();

      if (insertError) {
        console.error('Erro no upsert na tabela users:', insertError);
        console.error('Detalhes do erro:', {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code,
        });
        throw insertError;
      }

      console.log(
        'Dados inseridos/atualizados com sucesso na tabela users:',
        insertedData
      );

      // Redirect para área do estudante em caso de sucesso
      router.replace('/(student)');
    } catch (error: any) {
      console.error('Erro completo no registro:', error);
      if (error?.code === '23505') {
        setError('Este e-mail já está cadastrado. Tente fazer login.');
      } else if (error?.message?.includes('rate limit exceeded')) {
        setError('Muitas tentativas. Tente novamente mais tarde.');
      } else {
        setError('Ocorreu um erro durante o registro. Tente novamente.');
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View
          style={{
            backgroundColor: colors.background,
            alignItems: 'center',
            paddingTop: 64,
            paddingBottom: 40,
          }}
        >
          <View
            style={{
              width: 270,
              height: 200,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 10,
              overflow: 'hidden',
            }}
          >
            <Image
              source={require('@/assets/logo_login.png')}
              style={{ width: 290, height: '100%', resizeMode: 'cover' }}
            />
          </View>
        </View>

        <View
          style={[styles.formContainer, { backgroundColor: colors.background }]}
        >
          <Text style={[styles.welcomeText, { color: colors.text }]}>
            Criar Conta
          </Text>
          <Text style={[styles.subtitleText, { color: colors.textSecondary }]}>
            Preencha os dados para se registrar
          </Text>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View
            style={[
              styles.inputContainer,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <User size={20} color={colors.primary} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Nome completo"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
              autoComplete="name"
            />
          </View>

          <View
            style={[
              styles.inputContainer,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
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

          <View
            style={[
              styles.inputContainer,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Lock size={20} color={colors.primary} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Senha"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password-new"
            />
          </View>

          <View
            style={[
              styles.inputContainer,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Lock size={20} color={colors.primary} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Confirmar senha"
              placeholderTextColor={colors.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="password-new"
            />
          </View>

          <TouchableOpacity
            style={styles.registerButton}
            onPress={handleRegister}
          >
            <LinearGradient
              colors={['#EC4899', '#D946EF']}
              style={styles.gradientButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.registerButtonText}>Registrar</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.loginContainer}>
            <Text style={[styles.loginText, { color: colors.textSecondary }]}>
              Já tem uma conta?
            </Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={[styles.loginLink, { color: colors.primary }]}>
                {' '}
                Faça login
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
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
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
  },
  subtitleText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    marginBottom: 30,
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
  registerButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 24,
  },
  gradientButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
  },
  registerButtonText: {
    fontFamily: 'Poppins-Bold',
    color: 'white',
    fontSize: 16,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  loginText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
  },
  loginLink: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
  },
});

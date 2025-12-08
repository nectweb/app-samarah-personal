import React, { useEffect, useState } from 'react';
import { Alert, Modal } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import {
  User,
  Bell,
  Moon,
  Shield,
  CreditCard,
  CircleHelp as HelpCircle,
  LogOut,
  ChevronRight,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { DEFAULT_PROFILE_IMAGE } from '@/constants/images';

export default function SettingsScreen() {
  const { colors, theme, toggleTheme } = useTheme();
  const router = useRouter();
  const { signOut, user } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [userProfile, setUserProfile] = useState({
    nome: user?.name || '',
    email: user?.email || '',
    foto: null,
    telefone: null,
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      // Excluir dados do usuário nas principais tabelas
      const tablesToDelete = [
        'users',
        'medidas_corporais',
        'fichas_das_alunas',
        'fichas_treino',
        'controle_peso',
        // Adicione outras tabelas que tenham user_id ou aluna_id
      ];
      for (const table of tablesToDelete) {
        await supabase
          .from(table)
          .delete()
          .or(`user_id.eq.${user.id},aluna_id.eq.${user.id}`);
      }

      // Chama API PHP para excluir do Auth
      const response = await fetch('https://movimentosz.com.br/api/index.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          adminSecret: '#ffgd1223#*_fsd',
        }),
      });
      const result = await response.json();
      if (response.status === 200 || result.success) {
        // Sucesso!
        await supabase.auth.signOut();
        setDeleting(false);
        setShowDeleteModal(false);
        Alert.alert('Conta excluída', 'Sua conta foi removida do app e do login.');
        router.replace('/auth/login');
      } else {
        // Mostra erro detalhado
        console.error('Erro detalhado Supabase:', result.response);
        throw new Error(result.response || result.error || 'Erro ao excluir do Auth');
      }
    } catch (error) {
      setDeleting(false);
      Alert.alert('Erro', 'Não foi possível excluir a conta. Tente novamente.');
      console.error('Erro ao excluir conta:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('nome, email, foto, telefone')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      if (data) {
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Ajustes</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          <Image
            source={userProfile.foto || DEFAULT_PROFILE_IMAGE}
            style={styles.profileImage}
          />
          <Text style={[styles.profileName, { color: colors.text }]}>
            {userProfile.nome}
          </Text>
          <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
            {userProfile.email}
          </Text>
        </View>

        <View style={styles.settingsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Conta
          </Text>

          <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: colors.card }]}
            onPress={() => {
              console.log('Navegando para profile-details...');
              router.push(`/profile-details?user_id=${user?.id}`);
            }}
          >
            <View
              style={[
                styles.settingIcon,
                { backgroundColor: 'rgba(236, 72, 153, 0.1)' },
              ]}
            >
              <User size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>
                Informações Pessoais
              </Text>
              <Text
                style={[
                  styles.settingDescription,
                  { color: colors.textSecondary },
                ]}
              >
                Nome, email, telefone
              </Text>
            </View>
            <ChevronRight size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.settingItem, { backgroundColor: colors.card }]}>
            <View
              style={[
                styles.settingIcon,
                { backgroundColor: 'rgba(236, 72, 153, 0.1)' },
              ]}
            >
              <Moon size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>
                Tema Escuro
              </Text>
              <Text
                style={[
                  styles.settingDescription,
                  { color: colors.textSecondary },
                ]}
              >
                Alterar aparência do app
              </Text>
            </View>
            <Switch
              value={theme === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="white"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: colors.card }]}
          onPress={signOut}
        >
          <LogOut size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => setShowDeleteModal(true)}
        >
          <Shield size={20} color="#EF4444" />
          <Text style={styles.deleteText}>Excluir Conta</Text>
        </TouchableOpacity>

        <Modal
          visible={showDeleteModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDeleteModal(false)}
        >
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(0,0,0,0.4)',
            }}
          >
            <View
              style={{
                backgroundColor: colors.card,
                padding: 24,
                borderRadius: 16,
                width: '80%',
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: 'bold',
                  color: colors.text,
                  marginBottom: 12,
                }}
              >
                Confirmar Exclusão
              </Text>
              <Text style={{ color: colors.textSecondary, marginBottom: 24 }}>
                Tem certeza que deseja excluir sua conta? Esta ação é
                irreversível e todos os seus dados serão apagados.
              </Text>
              <View
                style={{ flexDirection: 'row', justifyContent: 'flex-end' }}
              >
                <TouchableOpacity
                  style={{ marginRight: 16 }}
                  onPress={() => setShowDeleteModal(false)}
                  disabled={deleting}
                >
                  <Text style={{ color: colors.primary }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDeleteAccount}
                  disabled={deleting}
                >
                  <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>
                    {deleting ? 'Excluindo...' : 'Excluir'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 32,
    overflow: 'hidden',
    justifyContent: 'center',
    width: '100%',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    resizeMode: 'cover',
  },
  profileName: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    marginBottom: 4,
  },
  profileEmail: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    marginBottom: 16,
  },
  editProfileButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editProfileText: {
    fontFamily: 'Poppins-Medium',
    color: 'white',
    fontSize: 14,
  },
  settingsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    marginBottom: 2,
  },
  settingDescription: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
  },
  logoutText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: '#EF4444',
    marginLeft: 8,
  },
  bottomPadding: {
    height: 100,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  deleteText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    marginLeft: 8,
    color: '#EF4444',
    fontWeight: 'bold',
  },
});

import React, { useEffect, useState } from 'react';
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
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
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
});

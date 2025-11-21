import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { DEFAULT_PROFILE_IMAGE } from '@/constants/images';
import * as ImagePicker from 'expo-image-picker';
import MaskInput from 'react-native-mask-input';
import { Camera, Instagram, Calendar, ArrowLeft } from 'lucide-react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface UserProfile {
  nome: string | null;
  email: string | null;
  telefone: string | null;
  instagram: string | null;
  foto: string | null;
  dataNasc: string | null;
}

const PHONE_MASK = [
  '+',
  '5',
  '5',
  ' ',
  '(',
  /\d/,
  /\d/,
  ')',
  ' ',
  /\d/,
  /\d/,
  /\d/,
  /\d/,
  /\d/,
  '-',
  /\d/,
  /\d/,
  /\d/,
  /\d/,
];
const DATE_MASK = [/\d/, /\d/, '/', /\d/, /\d/, '/', /\d/, /\d/, /\d/, /\d/];

export default function ProfileDetailsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { user_id } = useLocalSearchParams();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    nome: null,
    email: null,
    telefone: null,
    instagram: null,
    foto: null,
    dataNasc: null,
  });
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (user_id) {
      fetchUserProfile();
    }
  }, [user_id]);

  // Efeito para rolar para o topo quando entrar no modo de edição
  useEffect(() => {
    if (isEditing && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  }, [isEditing]);

  const fetchUserProfile = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('nome, email, telefone, instagram, foto, dataNasc')
        .eq('user_id', user_id)
        .single();

      if (error) throw error;
      if (data) {
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      Alert.alert(
        'Erro',
        'Não foi possível carregar as informações do perfil.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const pickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Permissão necessária',
        'Precisamos de permissão para acessar suas fotos.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setUploadingImage(true);
      try {
        // Simulando upload para Supabase Storage (em uma implementação real, você faria o upload para o storage)
        // const fileExt = result.assets[0].uri.split('.').pop();
        // const filePath = `${user_id}/${Math.random().toString(36).substring(2)}.${fileExt}`;

        // Aqui você faria o upload real para o Supabase Storage
        // const { error } = await supabase.storage.from('avatars').upload(filePath, result.assets[0].uri);

        // Simulando um atraso para demonstrar o indicador de carregamento
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Atualizando o perfil com a nova URL da imagem
        setUserProfile((prev) => ({
          ...prev,
          foto: result.assets[0].uri,
        }));

        // Atualiza no banco de dados
        const { error } = await supabase
          .from('users')
          .update({ foto: result.assets[0].uri })
          .eq('user_id', user_id);

        if (error) throw error;

        // Atualiza os dados do perfil localmente
        await fetchUserProfile();

        // Notifica o usuário
        Alert.alert('Sucesso', 'Foto atualizada com sucesso!');
      } catch (error) {
        console.error('Erro ao fazer upload da imagem:', error);
        Alert.alert('Erro', 'Não foi possível fazer o upload da imagem.');
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const handleSave = async () => {
    Keyboard.dismiss();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          nome: userProfile.nome,
          email: userProfile.email,
          telefone: userProfile.telefone,
          instagram: userProfile.instagram,
          dataNasc: userProfile.dataNasc,
          foto: userProfile.foto,
        })
        .eq('user_id', user_id);

      if (error) throw error;

      // Atualiza os dados localmente imediatamente
      await fetchUserProfile();

      // Faz logout automático e avisa o usuário
      Alert.alert(
        'Atualizado com sucesso',
        'Logout realizado para atualizar as informações.',
        [
          {
            text: 'OK',
            onPress: async () => {
              await supabase.auth.signOut();
              router.replace('/auth/login');
            },
          },
        ]
      );
      setIsEditing(false);
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      Alert.alert('Erro', 'Não foi possível atualizar as informações.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsEditing(false);
    fetchUserProfile();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';

    // Se a data já estiver no formato dd/mm/aaaa, retorna ela mesma
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
      return dateString;
    }

    // Tenta converter a data para o formato desejado
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';

      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();

      return `${day}/${month}/${year}`;
    } catch {
      return '-';
    }
  };

  const renderField = (
    label: string,
    value: string | null,
    field: keyof UserProfile,
    icon?: React.ReactNode,
    mask?: any
  ) => {
    if (isEditing) {
      return (
        <Animated.View
          style={styles.infoItem}
          entering={FadeIn.duration(300).delay(100)}
        >
          <View style={styles.labelContainer}>
            {icon}
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              {label}
            </Text>
          </View>

          {field === 'telefone' ? (
            <MaskInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                },
              ]}
              value={value || ''}
              onChangeText={(masked, unmasked) =>
                setUserProfile({ ...userProfile, [field]: masked })
              }
              mask={PHONE_MASK}
              placeholder={`Digite seu ${label.toLowerCase()}`}
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
            />
          ) : field === 'dataNasc' ? (
            <MaskInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                },
              ]}
              value={value || ''}
              onChangeText={(masked, unmasked) =>
                setUserProfile({ ...userProfile, [field]: masked })
              }
              mask={DATE_MASK}
              placeholder="DD/MM/AAAA"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />
          ) : (
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                },
              ]}
              value={value || ''}
              onChangeText={(text) =>
                setUserProfile({ ...userProfile, [field]: text })
              }
              placeholder={`Digite seu ${label.toLowerCase()}`}
              placeholderTextColor={colors.textSecondary}
              keyboardType={field === 'email' ? 'email-address' : 'default'}
              autoCapitalize={field === 'email' ? 'none' : 'words'}
            />
          )}
        </Animated.View>
      );
    }

    return (
      <View style={styles.infoItem}>
        <View style={styles.labelContainer}>
          {icon}
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
            {label}
          </Text>
        </View>
        <View style={styles.valueContainer}>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {field === 'dataNasc' ? formatDate(value) : value || '-'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
          >
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            Informações Pessoais
          </Text>
        </View>

        {isEditing && (
          <Animated.View
            style={styles.buttonContainer}
            entering={SlideInRight.duration(300)}
            exiting={SlideOutLeft.duration(300)}
          >
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={handleSave}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <Text style={[styles.buttonText, { color: colors.background }]}>
                  Salvar
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                {
                  backgroundColor: 'transparent',
                  borderWidth: 1,
                  borderColor: colors.border,
                },
              ]}
              onPress={handleCancel}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.profileSection}>
          <TouchableOpacity
            style={[
              styles.profileImageContainer,
              { borderColor: colors.border },
            ]}
            onPress={pickImage}
            disabled={!isEditing || uploadingImage}
            activeOpacity={isEditing ? 0.7 : 1}
          >
            {uploadingImage ? (
              <View
                style={[styles.profileImage, { backgroundColor: colors.card }]}
              >
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <Image
                source={userProfile.foto || DEFAULT_PROFILE_IMAGE}
                style={styles.profileImage}
                transition={300}
              />
            )}

            {isEditing && (
              <Animated.View
                style={[
                  styles.editPhotoButton,
                  { backgroundColor: colors.primary },
                ]}
                entering={FadeIn.duration(300)}
              >
                <Camera size={16} color="white" />
              </Animated.View>
            )}
          </TouchableOpacity>

          {!isEditing && (
            <TouchableOpacity
              style={[
                styles.editProfileButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setIsEditing(true);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.editProfileText}>Editar Perfil</Text>
            </TouchableOpacity>
          )}
        </View>

        <View
          style={[
            styles.infoSection,
            {
              backgroundColor: isEditing ? colors.background : colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          {renderField('Nome', userProfile.nome, 'nome')}
          {renderField('Email', userProfile.email, 'email')}
          {renderField(
            'Telefone',
            userProfile.telefone,
            'telefone',
            <View
              style={[
                styles.fieldIcon,
                { backgroundColor: 'rgba(236, 72, 153, 0.1)' },
              ]}
            >
              <Text style={{ color: colors.primary }}>+55</Text>
            </View>
          )}
          {renderField(
            'Instagram',
            userProfile.instagram,
            'instagram',
            <View
              style={[
                styles.fieldIcon,
                { backgroundColor: 'rgba(236, 72, 153, 0.1)' },
              ]}
            >
              <Instagram size={16} color={colors.primary} />
            </View>
          )}
          {renderField(
            'Data de Nascimento',
            userProfile.dataNasc,
            'dataNasc',
            <View
              style={[
                styles.fieldIcon,
                { backgroundColor: 'rgba(236, 72, 153, 0.1)' },
              ]}
            >
              <Calendar size={16} color={colors.primary} />
            </View>
          )}
        </View>
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
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    marginRight: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  profileImageContainer: {
    position: 'relative',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    padding: 2,
    marginBottom: 16,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editPhotoButton: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  editProfileButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  editProfileText: {
    fontFamily: 'Poppins-Medium',
    color: 'white',
    fontSize: 14,
  },
  infoSection: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  infoItem: {
    marginBottom: 24,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  infoLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
  },
  valueContainer: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  infoValue: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
  },
  input: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    paddingLeft: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  buttonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
  },
});

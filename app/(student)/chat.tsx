import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/context/ThemeContext';
import { Clock, MessageCircle, ArrowLeft, Shield } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function ContactScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const openWhatsApp = () => {
    // Substitua pelo número correto da professora
    Linking.openURL('https://wa.me/5532991135742');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity 
        style={[styles.backButton, { backgroundColor: colors.card }]}
        onPress={() => router.back()}
      >
        <ArrowLeft size={24} color={colors.text} />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Contatos</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Entre em contato diretamente com sua treinadora
        </Text>
      </View>

      <View style={styles.contactsContainer}>
        <TouchableOpacity 
          style={[styles.contactCard, { backgroundColor: colors.card }]}
          onPress={openWhatsApp}
          activeOpacity={0.9}
        >
          <View style={styles.profileSection}>
            <Image
              source={require('@/assets/images/whatsapp.svg')}
              style={styles.whatsappLogo}
            />
            <View style={styles.profileInfo}>
              <Text style={[styles.contactTitle, { color: colors.text }]}>WhatsApp</Text>
              <Text style={[styles.contactSubtitle, { color: colors.textSecondary }]}>Atendimento personalizado</Text>
            </View>
          </View>
          
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          
          <View style={styles.contactHeader}>
            <View style={[styles.infoRow, { marginBottom: 8 }]}>
              <Clock size={18} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.text }]}>Disponível: 8h às 20h</Text>
            </View>
            <View style={styles.infoRow}>
              <MessageCircle size={18} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.text }]}>Resposta em até 2 horas</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.messageButton, { backgroundColor: '#25D366' }]} 
            onPress={openWhatsApp}
          >
            <Text style={styles.messageButtonText}>Enviar mensagem</Text>
          </TouchableOpacity>
        </TouchableOpacity>
        
        <View style={styles.privacyContainer}>
          <View style={styles.privacyHeader}>
            <Shield size={16} color={colors.textSecondary} />
            <Text style={[styles.privacyTitle, { color: colors.textSecondary }]}>
              Privacidade
            </Text>
          </View>
          <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
            Suas mensagens são confidenciais e utilizadas apenas para atendimento personalizado. Não compartilhamos seus dados.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 40,
    marginTop: 40,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
  },
  contactsContainer: {
    paddingHorizontal: 20,
    gap: 20,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileInfo: {
    flex: 1,
  },
  whatsappLogo: {
    width: 60,
    height: 60,
    marginRight: 16,
  },
  contactCard: {
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  contactHeader: {
    marginBottom: 20,
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: 16,
  },
  contactTitle: {
    marginBottom: 4,
  },
  contactSubtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 15,
    marginLeft: 10,
  },
  messageButton: {
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  messageButtonText: {
    color: 'white',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
  },
  privacyContainer: {
    marginTop: 16,
    padding: 16,
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  privacyTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    marginLeft: 8,
  },
  privacyText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.8,
  },
});
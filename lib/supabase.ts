import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://trmrdacturrhlnvsuegb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRybXJkYWN0dXJyaGxudnN1ZWdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgzMTI5MjMsImV4cCI6MjA1Mzg4ODkyM30.tErbZVrE2_RPJjNjfjD0godbqzqspSwZ9IKlSNDvFu0';

// Custom storage com logs
const customStorage = {
  getItem: async (key: string) => {
    const value = await AsyncStorage.getItem(key);
    console.log(`📦 AsyncStorage GET [${key}]:`, value ? 'sessão encontrada' : 'vazio');
    return value;
  },
  setItem: async (key: string, value: string) => {
    console.log(`💾 AsyncStorage SET [${key}]:`, value.substring(0, 50) + '...');
    await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    console.log(`🗑️ AsyncStorage REMOVE [${key}]`);
    await AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
import React, { createContext, useContext, useState, useEffect } from 'react';
import { router, useSegments, useRootNavigationState } from 'expo-router';
import { supabase } from '@/lib/supabase';

type User = {
  id: string;
  email: string;
  role: 'trainer' | 'student';
  name: string;
  admin: boolean;
};

type AuthContextType = {
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    role: 'trainer' | 'student',
    name: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  isLoading: true,
});

// This hook will protect the route access based on user authentication
function useProtectedRoute(user: User | null) {
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!navigationState?.key) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Redirect to the sign-in page if not authenticated
      router.replace('/login');
    } else if (user) {
      if (inAuthGroup) {
        // Redirect to the appropriate role-based home screen
        if (user.admin) {
          router.replace('/(tabs)');
        } else {
          router.replace('/(student)');
        }
      } else {
        // Check if user is in the correct role-based route
        const inTrainerGroup = segments[0] === '(tabs)';
        const inStudentGroup = segments[0] === '(student)';
        // Routes that should be accessible regardless of role (shared between trainer/student)
        // Check any segment to allow nested routes like '/(student)/workout-exercises'
        const isSharedRoute = (segments || []).some((s) =>
          ['workout', 'client-details', 'workout-exercises'].includes(s)
        );

        if (user.role === 'trainer' && !inTrainerGroup && !isSharedRoute) {
          router.replace('/(tabs)');
        } else if (
          user.role === 'student' &&
          !inStudentGroup &&
          !isSharedRoute
        ) {
          router.replace('/(student)');
        }
      }
    }
  }, [user, segments, navigationState?.key]);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useProtectedRoute(user);

  useEffect(() => {
    // Check for stored authentication state
    console.log('🔐 AuthContext: Verificando sessão armazenada...');
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.error('❌ Erro ao obter sessão:', error);
      }
      
      if (session?.user) {
        console.log('✅ Sessão encontrada:', session.user.email);
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('nome, admin')
          .eq('user_id', session.user.id)
          .single();

        if (profileError) {
          console.error('❌ Erro ao buscar perfil:', profileError);
        }

        const userData: User = {
          id: session.user.id,
          email: session.user.email!,
          role: profile?.admin ? 'trainer' : 'student',
          name: profile?.nome || session.user.email!.split('@')[0],
          admin: profile?.admin || false,
        };
        console.log('👤 Usuário carregado:', userData.email, 'Role:', userData.role);
        setUser(userData);
      } else {
        console.log('❌ Nenhuma sessão encontrada');
      }
      setIsLoading(false);
    });

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event);
      
      if (session?.user) {
        console.log('✅ Nova sessão ativa:', session.user.email);
        const { data: profile } = await supabase
          .from('users')
          .select('nome, admin')
          .eq('user_id', session.user.id)
          .single();

        const userData: User = {
          id: session.user.id,
          email: session.user.email!,
          role: profile?.admin ? 'trainer' : 'student',
          name: profile?.nome || session.user.email!.split('@')[0],
          admin: profile?.admin || false,
        };
        console.log('👤 Usuário atualizado:', userData.email, 'Role:', userData.role);
        setUser(userData);
      } else {
        console.log('❌ Sessão removida - usuário deslogado');
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 Tentando fazer login:', email);
      const {
        data: { user },
        error,
      } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Erro no login:', error.message);
        throw error;
      }

      if (user) {
        console.log('✅ Login bem-sucedido:', user.email);
        const { data: profile } = await supabase
          .from('users')
          .select('nome, admin')
          .eq('user_id', user.id)
          .single();

        const userData: User = {
          id: user.id,
          email: user.email!,
          role: profile?.admin ? 'trainer' : 'student',
          name: profile?.nome || user.email!.split('@')[0],
          admin: profile?.admin || false,
        };

        setUser(userData);

        if (userData.admin) {
          router.replace('/(tabs)');
        } else {
          router.replace('/(student)');
        }
      }
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Failed to sign in'
      );
    }
  };

  const signUp = async (
    email: string,
    password: string,
    role: 'trainer' | 'student',
    name: string
  ) => {
    try {
      const {
        data: { user },
        error: signUpError,
      } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;

      if (user) {
        const { error: profileError } = await supabase.from('profiles').insert([
          {
            id: user.id,
            email: user.email,
            role,
            name,
          },
        ]);

        if (profileError) throw profileError;

        const userData: User = {
          id: user.id,
          email: user.email!,
          role,
          name,
          admin: role === 'trainer',
        };

        setUser(userData);

        if (role === 'trainer') {
          router.replace('/(trainer)');
        } else {
          router.replace('/(student)');
        }
      }
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Failed to sign up'
      );
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      router.replace('/login');
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Failed to sign out'
      );
    }
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signUp, signOut, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

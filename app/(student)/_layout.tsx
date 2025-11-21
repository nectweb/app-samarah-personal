import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Chrome as Home, Calendar, CreditCard, Bell, Settings, BicepsFlexed, ListTodo, Mail } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import CustomTabBar from '@/components/CustomTabBar';

export default function StudentTabLayout() {
  const colorScheme = useColorScheme();
  const { colors } = useTheme();

  return (
    <Tabs
      tabBar={(props) => (
        <CustomTabBar 
          {...props}
          // Lista apenas as rotas que devem aparecer na barra de navegação
          visibleRoutes={['index', 'chat', 'assessments', 'student-workouts', 'settings']} 
        />
      )}
      screenOptions={{
        tabBarActiveTintColor: '#EC4899',
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontFamily: 'Poppins-Medium',
          fontSize: 12,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarShowLabel: false,
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="assessments"
        options={{
          title: 'Avaliações',
          tabBarShowLabel: false,
          tabBarIcon: ({ color, size }) => <ListTodo size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="student-workouts"
        options={{
          title: 'Treinos',
          tabBarShowLabel: false,
          tabBarIcon: ({ color, size }) => <BicepsFlexed size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Contatos',
          tabBarShowLabel: false,
          tabBarIcon: ({ color, size }) => <Mail size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          tabBarShowLabel: false,
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
      
      {/* Rotas ocultas - não aparecem na TabBar */}
      <Tabs.Screen
        name="anamnese"
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="assessment-detail"
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="change-password"
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="medidas-corporais"
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="profile-details"
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="workout-exercises"
        options={{
          tabBarButton: () => null,
        }}
      />
    </Tabs>
  );
}
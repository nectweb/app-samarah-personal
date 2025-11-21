import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Chrome as Home, Users, ChartBar as BarChart2, BookOpen, BicepsFlexed, Dumbbell, CircleUser, Target } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import CustomTabBar from '@/components/CustomTabBar';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { colors } = useTheme();

  return (
    <Tabs
      tabBar={(props) => (
        <CustomTabBar 
          {...props}
          // Lista apenas as rotas que devem aparecer na barra de navegação
          visibleRoutes={['index', 'fichas', 'workouts', 'clients', 'exercises', 'assessments', 'manage-cycles']} 
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
          title: 'Dashboard',
          tabBarShowLabel: false,
          tabBarIcon: ({ color, size }) => <CircleUser size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: 'Treinos',
          tabBarShowLabel: false,
          tabBarIcon: ({ color, size }) => <Dumbbell size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: 'Alunas',
          tabBarShowLabel: false,
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: 'Exercícios',
          tabBarShowLabel: false,
          tabBarIcon: ({ color, size }) => <BicepsFlexed size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="assessments"
        options={{
          title: 'Avaliações',
          tabBarShowLabel: false,
          tabBarIcon: ({ color, size }) => <BarChart2 size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="workout-details"
        options={{
          tabBarButton: () => null,  // Remove o botão da barra de tabs
        }}
      />
      
      <Tabs.Screen
        name="assessment"
        options={{
          tabBarButton: () => null,  // Remove o botão da barra de tabs
        }}
      />
      <Tabs.Screen
        name="fichas"
        options={{
          title: 'Fichas',
          tabBarShowLabel: false,
          tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="manage-cycles"
        options={{
          title: 'Ciclos',
          tabBarShowLabel: false,
          tabBarIcon: ({ color, size }) => <Target size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

type CustomTabBarProps = {
  state: any;
  descriptors: any;
  navigation: any;
  visibleRoutes: string[];
};

export default function CustomTabBar({ state, descriptors, navigation, visibleRoutes }: CustomTabBarProps) {
  const { colors } = useTheme();
  
  // Filtra apenas as rotas que estão no array visibleRoutes
  const filteredRoutes = state.routes.filter((route: any) => 
    visibleRoutes.includes(route.name)
  );

  return (
    <View style={[styles.container, { 
      backgroundColor: colors.background,
      borderTopColor: colors.border,
    }]}>
      {filteredRoutes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel || options.title || route.name;
        const isFocused = state.index === state.routes.findIndex((r: any) => r.name === route.name);

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tabButton}
          >
            {options.tabBarIcon && options.tabBarIcon({
              focused: isFocused,
              color: isFocused ? colors.primary : colors.textSecondary,
              size: 24,
            })}
            {options.tabBarShowLabel !== false && (
              <Text style={[styles.tabLabel, { 
                color: isFocused ? colors.primary : colors.textSecondary,
                fontFamily: 'Poppins-Medium',
              }]}>
                {label}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 60,
    paddingBottom: 20,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
  },
});
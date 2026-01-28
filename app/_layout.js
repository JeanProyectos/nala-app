import { Tabs, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, View, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { PermissionsProvider, usePermissions } from '../context/PermissionsContext';

// Mantener la splash screen visible hasta que la app esté lista
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { menu, loading: permsLoading } = usePermissions();
  const loading = authLoading || permsLoading;

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#8B7FA8" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
      </Stack>
    );
  }

  // Generar tabs dinámicamente basado en el menú de permisos
  const getTabIcon = (iconEmoji) => {
    return () => <Text style={{ fontSize: 24 }}>{iconEmoji || '•'}</Text>;
  };

  return (
    <>
      <StatusBar style="auto" />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#8B7FA8',
          tabBarInactiveTintColor: '#C4C4C4',
          headerStyle: {
            backgroundColor: '#F8F8F8',
          },
          headerTintColor: '#333',
          headerTitleStyle: {
            fontWeight: '600',
          },
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopColor: '#E8E8E8',
            borderTopWidth: 1,
          },
        }}
      >
        {/* Renderizar tabs dinámicamente desde el menú */}
        {menu.map((item) => {
          // Extraer el nombre de la ruta desde el path (ej: '/index' -> 'index')
          const routeName = item.path.replace('/', '') || 'index';
          
          return (
            <Tabs.Screen
              key={item.id}
              name={routeName}
              options={{
                title: item.label,
                tabBarLabel: item.label,
                tabBarIcon: ({ color }) => (
                  <Text style={{ fontSize: 24, color }}>{item.icon || '•'}</Text>
                ),
              }}
            />
          );
        })}
        <Tabs.Screen
          name="login"
          options={{
            href: null, // Ocultar de las tabs
          }}
        />
      </Tabs>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <PermissionsProvider>
        <RootLayoutNav />
      </PermissionsProvider>
    </AuthProvider>
  );
}


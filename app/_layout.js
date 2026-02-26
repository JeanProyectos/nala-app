import { Tabs, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, View, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { PermissionsProvider, usePermissions } from '../context/PermissionsContext';
import { NotificationsProvider } from '../context/NotificationsContext';

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

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" options={{ href: null }} />
        <Stack.Screen name="veterinario-registro" options={{ presentation: 'modal' }} />
        <Stack.Screen name="veterinario/editar-perfil" options={{ title: 'Editar Perfil' }} />
        <Stack.Screen name="admin/validar-veterinarios" options={{ title: 'Validar Veterinarios' }} />
        <Stack.Screen name="admin/configurar-comision" options={{ title: 'Configurar Comisión' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <NotificationsProvider>
        <PermissionsProvider>
          <RootLayoutNav />
        </PermissionsProvider>
      </NotificationsProvider>
    </AuthProvider>
  );
}


import { Tabs, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, View, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { AppAlertProvider } from '../context/AppAlertContext';
import { PermissionsProvider, usePermissions } from '../context/PermissionsContext';
import { NotificationsProvider } from '../context/NotificationsContext';
import ErrorBoundary from '../components/ErrorBoundary';

// Mantener la splash screen visible hasta que la app esté lista
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { menu, loading: permsLoading } = usePermissions();
  const [onboardingCompleted, setOnboardingCompleted] = useState(null);
  const loading = authLoading || permsLoading;

  useEffect(() => {
    checkOnboarding();
  }, []);

  useEffect(() => {
    if (!loading && onboardingCompleted !== null) {
      SplashScreen.hideAsync();
    }
  }, [loading, onboardingCompleted]);

  const checkOnboarding = async () => {
    try {
      const completed = await AsyncStorage.getItem('onboarding_completed');
      setOnboardingCompleted(completed === 'true');
    } catch (error) {
      setOnboardingCompleted(false);
    }
  };

  if (loading || onboardingCompleted === null) {
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

  // Show onboarding if not completed
  if (!onboardingCompleted) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="onboarding" />
      </Stack>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" options={{ href: null }} />
        <Stack.Screen name="onboarding" options={{ href: null }} />
        <Stack.Screen name="veterinario-registro" options={{ presentation: 'modal' }} />
        <Stack.Screen name="veterinario/editar-perfil" options={{ title: 'Editar Perfil' }} />
        <Stack.Screen name="editar-perfil-usuario" options={{ title: 'Editar Perfil' }} />
        <Stack.Screen name="admin/validar-veterinarios" options={{ title: 'Validar Veterinarios' }} />
        <Stack.Screen name="admin/configurar-comision" options={{ title: 'Configurar Comisión' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <AppAlertProvider>
            <NotificationsProvider>
              <PermissionsProvider>
                <RootLayoutNav />
              </PermissionsProvider>
            </NotificationsProvider>
          </AppAlertProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}


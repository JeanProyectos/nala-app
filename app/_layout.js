import { Tabs, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, View, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../context/AuthContext';

// Mantener la splash screen visible hasta que la app esté lista
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isAuthenticated, loading } = useAuth();

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
        <Tabs.Screen
          name="index"
          options={{
            title: 'Chat',
            tabBarLabel: 'Chat',
            tabBarIcon: ({ color }) => (
              <TabBarIcon name="chatbubble-outline" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="mascota"
          options={{
            title: 'Mascota',
            tabBarLabel: 'Mascota',
            tabBarIcon: ({ color }) => (
              <TabBarIcon name="paw-outline" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="perfil"
          options={{
            title: 'Perfil',
            tabBarLabel: 'Perfil',
            tabBarIcon: ({ color }) => (
              <TabBarIcon name="person-outline" color={color} />
            ),
          }}
        />
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
      <RootLayoutNav />
    </AuthProvider>
  );
}

function TabBarIcon({ name, color }) {
  return (
    <Text style={{ fontSize: 24 }}>{getIconEmoji(name)}</Text>
  );
}

function getIconEmoji(name) {
  const icons = {
    'chatbubble-outline': '💬',
    'paw-outline': '🐾',
    'person-outline': '👤',
  };
  return icons[name] || '•';
}

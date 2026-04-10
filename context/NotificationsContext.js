import React, { createContext, useState, useEffect, useContext } from 'react';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as api from '../services/api';
import { useAuth } from './AuthContext';

// Configurar cómo se manejan las notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const NotificationsContext = createContext();

export function NotificationsProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      // Usar setTimeout para evitar que bloquee la inicialización
      setTimeout(() => {
        registerForPushNotifications().catch(error => {
          console.warn('Error al registrar notificaciones (no crítico):', error.message);
        });
      }, 1000);
    }
  }, [isAuthenticated]);

  // Configurar listener para notificaciones recibidas
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      console.log('📬 Notificación recibida:', notification);
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('👆 Usuario interactuó con notificación:', response);
        const data = response.notification.request.content.data;
        // Aquí puedes navegar a la pantalla correspondiente según el tipo de notificación
      }
    );

    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  }, []);

  const registerForPushNotifications = async () => {
    try {
      setLoading(true);

      // Solicitar permisos
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Permisos de notificaciones no otorgados');
        setLoading(false);
        return;
      }

      // Obtener el token
      // Para desarrollo local, usar el experienceId o intentar sin projectId
      let token;
      try {
        // Intentar obtener projectId de Constants si está disponible
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const experienceId = Constants.expoConfig?.slug || Constants.manifest?.slug;
        
        if (projectId) {
          token = await Notifications.getExpoPushTokenAsync({
            projectId: projectId,
          });
        } else if (experienceId) {
          // Usar experienceId como alternativa para desarrollo
          token = await Notifications.getExpoPushTokenAsync({
            experienceId: experienceId,
          });
        } else {
          // Intentar sin parámetros (funciona en Expo Go)
          token = await Notifications.getExpoPushTokenAsync();
        }
      } catch (tokenError) {
        // Si el error es sobre projectId, intentar con experiencia local
        if (tokenError.message?.includes('projectId') || tokenError.message?.includes('experienceId')) {
          try {
            // Último intento: usar experiencia local
            const experienceId = `@${Constants.expoConfig?.owner || 'anonymous'}/${Constants.expoConfig?.slug || 'nala'}`;
            token = await Notifications.getExpoPushTokenAsync({
              experienceId: experienceId,
            });
          } catch (fallbackError) {
            console.warn('⚠️ Notificaciones push no disponibles en desarrollo local. Funcionarán notificaciones locales.');
            // Continuar sin token push - las notificaciones locales seguirán funcionando
            setLoading(false);
            return;
          }
        } else {
          throw tokenError;
        }
      }

      setExpoPushToken(token.data);
      console.log('📱 Expo Push Token:', token.data);

      // Enviar token al backend
      if (token.data) {
        try {
          await api.registerPushToken(token.data);
          console.log('✅ Token registrado en el backend');
        } catch (error) {
          console.error('Error registrando token:', error);
        }
      }
    } catch (error) {
      // Solo mostrar error si no es sobre projectId
      if (!error.message?.includes('projectId')) {
        console.error('Error registrando notificaciones:', error);
      } else {
        console.warn('⚠️ Notificaciones push no disponibles en desarrollo local');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <NotificationsContext.Provider
      value={{
        expoPushToken,
        loading,
        registerForPushNotifications,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications debe usarse dentro de NotificationsProvider');
  }
  return context;
}

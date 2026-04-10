import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as api from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Verificar si hay un token guardado al iniciar
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        try {
          // Intentar obtener el perfil del usuario
          const profile = await api.getProfile();
          setUser(profile);
          setIsAuthenticated(true);
        } catch (error) {
          // Si hay error al obtener perfil, pero hay token, mantener autenticado
          // El token podría ser válido pero el servidor no está disponible
          console.warn('No se pudo verificar el perfil, pero hay token guardado:', error.message);
          // No limpiar el token si es error de red - podría ser temporal
          if (error.message.includes('Network') || error.message.includes('Failed to fetch') || error.message.includes('conectar')) {
            // Error de red - mantener token pero marcar como no autenticado para que intente login
            setIsAuthenticated(false);
            setUser(null);
          } else {
            // Otro tipo de error - limpiar token
            await AsyncStorage.removeItem('token');
            setUser(null);
            setIsAuthenticated(false);
          }
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      // Error al leer AsyncStorage
      console.error('Error leyendo token:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    try {
      const response = await api.login(email, password);
      setUser(response.user);
      setIsAuthenticated(true);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const signUp = async (name, email, password, isVeterinarian = false) => {
    try {
      const response = await api.register(name, email, password, isVeterinarian);
      setUser(response.user);
      setIsAuthenticated(true);
      return { success: true, isVeterinarian: isVeterinarian };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    await api.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        signIn,
        signUp,
        signOut,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}


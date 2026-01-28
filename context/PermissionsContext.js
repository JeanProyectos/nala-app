import React, { createContext, useState, useEffect, useContext } from 'react';
import * as api from '../services/api';
import { useAuth } from './AuthContext';

const PermissionsContext = createContext();

export function PermissionsProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const [permissions, setPermissions] = useState(null);
  // Menú por defecto para USER hasta que se carguen los permisos
  const [menu, setMenu] = useState(getDefaultMenu('USER'));
  const [loading, setLoading] = useState(true);
  
  // Función helper para obtener menú por defecto
  function getDefaultMenu(role) {
    const menus = {
      USER: [
        { id: 'index', label: 'Chat', path: '/index', icon: '💬' },
        { id: 'mascota', label: 'Mis Mascotas', path: '/mascota', icon: '🐾' },
        { id: 'perfil', label: 'Mi Perfil', path: '/perfil', icon: '👤' },
      ],
      VET: [
        { id: 'index', label: 'Chat', path: '/index', icon: '💬' },
        { id: 'mascota', label: 'Mascotas Asignadas', path: '/mascota', icon: '🐾' },
        { id: 'perfil', label: 'Mi Perfil', path: '/perfil', icon: '👤' },
      ],
      ADMIN: [
        { id: 'index', label: 'Chat', path: '/index', icon: '💬' },
        { id: 'mascota', label: 'Todas las Mascotas', path: '/mascota', icon: '🐾' },
        { id: 'perfil', label: 'Mi Perfil', path: '/perfil', icon: '👤' },
      ],
    };
    return menus[role] || menus.USER;
  }

  useEffect(() => {
    if (isAuthenticated && user) {
      loadPermissions();
    } else {
      setPermissions(null);
      setMenu([]);
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const data = await api.getPermissions();
      setPermissions(data);
      setMenu(data.menu || getDefaultMenu(data.role || 'USER'));
    } catch (error) {
      console.error('Error cargando permisos:', error);
      // Si falla, usar menú por defecto según el rol del usuario
      const defaultRole = user?.role || 'USER';
      const defaultPermissions = { role: defaultRole, permissions: [], menu: getDefaultMenu(defaultRole) };
      setPermissions(defaultPermissions);
      setMenu(defaultPermissions.menu);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PermissionsContext.Provider
      value={{
        permissions,
        menu,
        loading,
        reloadPermissions: loadPermissions,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions debe usarse dentro de PermissionsProvider');
  }
  return context;
}

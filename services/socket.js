import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const DEFAULT_API_URL = 'https://nala-api.patasypelos.xyz';

function resolveApiUrl() {
  const configuredUrl =
    Constants.expoConfig?.extra?.apiUrl ||
    Constants.manifest2?.extra?.apiUrl ||
    Constants.manifest2?.extra?.expoClient?.extra?.apiUrl ||
    Constants.manifest?.extra?.apiUrl;

  return (configuredUrl || DEFAULT_API_URL).replace(/\/+$/, '');
}

const API_URL = resolveApiUrl();

let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
let isManuallyDisconnected = false;

/**
 * ✅ Conecta al WebSocket del chat con manejo robusto de reconexión
 * @param {string} token - JWT token
 * @returns {Promise<Socket>}
 */
export async function connectSocket(token) {
  // Si ya hay un socket conectado, reutilizarlo
  if (socket && socket.connected) {
    console.log('✅ Reutilizando socket existente');
    return socket;
  }

  // Si hay un socket desconectado, limpiarlo
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  isManuallyDisconnected = false;
  reconnectAttempts = 0;

  const socketUrl = `${API_URL}/chat`;
  console.log(`🔌 Conectando a: ${socketUrl}`);

  socket = io(socketUrl, {
    auth: {
      token,
    },
    transports: ['polling', 'websocket'],
    path: '/socket.io',
    upgrade: true,
    rememberUpgrade: false,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000, // Máximo 10 segundos entre intentos
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    timeout: 20000,
    forceNew: false,
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (!socket.connected) {
        console.error('⏱️ Timeout conectando al socket');
        reject(new Error('Timeout conectando al socket'));
      }
    }, 20000);

    // ✅ Evento de conexión exitosa
    socket.on('connect', () => {
      console.log('✅ Conectado al WebSocket, ID:', socket.id);
      reconnectAttempts = 0;
      clearTimeout(timeout);
      resolve(socket);
    });

    // ✅ Evento de confirmación del servidor
    socket.on('connected', (data) => {
      console.log('✅ Servidor confirmó conexión:', data);
    });

    // ✅ Manejo de errores de conexión
    socket.on('connect_error', (error) => {
      console.error('❌ Error conectando al WebSocket:', error.message);
      reconnectAttempts++;
      
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        clearTimeout(timeout);
        reject(new Error(`No se pudo conectar después de ${MAX_RECONNECT_ATTEMPTS} intentos`));
      }
    });

    // ✅ Manejo de desconexión
    socket.on('disconnect', (reason) => {
      console.warn('⚠️ Socket desconectado:', reason);
      
      // Si fue desconexión manual, no reconectar
      if (isManuallyDisconnected) {
        return;
      }

      // Si fue error del servidor o timeout, intentar reconectar
      if (reason === 'io server disconnect' || reason === 'transport close') {
        console.log('🔄 Intentando reconectar...');
      }
    });

    // ✅ Manejo de reconexión
    socket.on('reconnect', (attemptNumber) => {
      console.log(`✅ Reconectado después de ${attemptNumber} intentos`);
      reconnectAttempts = 0;
    });

    // ✅ Manejo de error de reconexión
    socket.on('reconnect_error', (error) => {
      console.error('❌ Error en reconexión:', error.message);
    });

    // ✅ Manejo de intentos de reconexión agotados
    socket.on('reconnect_failed', () => {
      console.error('❌ Falló la reconexión después de múltiples intentos');
      clearTimeout(timeout);
      reject(new Error('No se pudo reconectar al servidor'));
    });

    // ✅ Ping/pong para mantener conexión viva
    socket.on('pong', (data) => {
      console.debug('🏓 Pong recibido:', data);
    });
  });
}

/**
 * ✅ Desconecta del WebSocket
 */
export function disconnectSocket() {
  isManuallyDisconnected = true;
  
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  
  reconnectAttempts = 0;
}

/**
 * ✅ Obtiene la instancia del socket
 */
export function getSocket() {
  return socket;
}

/**
 * ✅ Verifica si el socket está conectado
 */
export function isSocketConnected() {
  return socket && socket.connected;
}

/**
 * ✅ Conecta automáticamente usando el token guardado
 */
export async function connectSocketWithStoredToken() {
  try {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      return await connectSocket(token);
    }
    return null;
  } catch (error) {
    console.error('Error conectando socket:', error);
    return null;
  }
}

/**
 * ✅ Reconectar manualmente
 */
export async function reconnectSocket() {
  try {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      disconnectSocket();
      await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 segundo
      return await connectSocket(token);
    }
    return null;
  } catch (error) {
    console.error('Error reconectando socket:', error);
    return null;
  }
}

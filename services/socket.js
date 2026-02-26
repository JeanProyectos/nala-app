import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOCKET_URL = 'http://192.168.20.53:3000';

let socket = null;

/**
 * Conecta al WebSocket del chat
 * @param {string} token - JWT token
 * @returns {Promise<Socket>}
 */
export async function connectSocket(token) {
  if (socket && socket.connected) {
    return socket;
  }

  socket = io(`${SOCKET_URL}/chat`, {
    auth: {
      token,
    },
    transports: ['websocket'],
  });

  return new Promise((resolve, reject) => {
    socket.on('connect', () => {
      console.log('✅ Conectado al WebSocket');
      resolve(socket);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Error conectando al WebSocket:', error);
      reject(error);
    });
  });
}

/**
 * Desconecta del WebSocket
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Obtiene la instancia del socket
 */
export function getSocket() {
  return socket;
}

/**
 * Conecta automáticamente usando el token guardado
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

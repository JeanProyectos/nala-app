import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️ IMPORTANTE: Cambia esta IP por la IP de tu computadora
// En Windows: ipconfig (busca IPv4)
// Ejemplo: "http://192.168.1.8:3000"
const API_URL = "http://192.168.1.8:3000";

// Función helper para hacer requests con autenticación
async function apiRequest(endpoint, options = {}) {
  const token = await AsyncStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Si la respuesta no es JSON, puede ser un error de conexión
    let data;
    try {
      data = await response.json();
    } catch (e) {
      if (!response.ok) {
        throw new Error(`Error ${response.status}: No se pudo conectar con el servidor`);
      }
      throw new Error('Error al procesar la respuesta del servidor');
    }

    if (!response.ok) {
      const errorMessage = data.message || data.error || `Error ${response.status}`;
      console.error('API Error:', {
        status: response.status,
        endpoint,
        message: errorMessage,
        data,
      });
      throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    console.error('API Error:', {
      endpoint,
      error: error.message,
      url: `${API_URL}${endpoint}`,
    });
    
    // Mensajes más amigables para errores comunes
    if (error.message.includes('Network request failed') || error.message.includes('Failed to fetch')) {
      throw new Error('No se pudo conectar con el servidor. Verifica que:\n1. El backend esté corriendo\n2. La IP sea correcta\n3. Ambos dispositivos estén en la misma red WiFi');
    }
    
    throw error;
  }
}

// ============ AUTH ============

/**
 * Registra un nuevo usuario
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<{user: object, token: string}>}
 */
export async function register(email, password) {
  const response = await apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  
  // Guardar token
  if (response.token) {
    await AsyncStorage.setItem('token', response.token);
  }
  
  return response;
}

/**
 * Inicia sesión
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<{user: object, token: string}>}
 */
export async function login(email, password) {
  const response = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  
  // Guardar token
  if (response.token) {
    await AsyncStorage.setItem('token', response.token);
  }
  
  return response;
}

/**
 * Cierra sesión
 */
export async function logout() {
  await AsyncStorage.removeItem('token');
}

/**
 * Obtiene el token guardado
 */
export async function getToken() {
  return await AsyncStorage.getItem('token');
}

// ============ USERS ============

/**
 * Obtiene el perfil del usuario autenticado
 * @returns {Promise<object>}
 */
export async function getProfile() {
  return await apiRequest('/users/me');
}

// ============ PETS ============

/**
 * Obtiene todas las mascotas del usuario
 * @returns {Promise<Array>}
 */
export async function getPets() {
  return await apiRequest('/pets');
}

/**
 * Obtiene una mascota por ID
 * @param {number} id 
 * @returns {Promise<object>}
 */
export async function getPet(id) {
  return await apiRequest(`/pets/${id}`);
}

/**
 * Crea una nueva mascota
 * @param {object} petData - { name, species, age?, weight? }
 * @returns {Promise<object>}
 */
export async function createPet(petData) {
  return await apiRequest('/pets', {
    method: 'POST',
    body: JSON.stringify(petData),
  });
}

/**
 * Actualiza una mascota
 * @param {number} id 
 * @param {object} petData - { name?, species?, age?, weight? }
 * @returns {Promise<object>}
 */
export async function updatePet(id, petData) {
  return await apiRequest(`/pets/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(petData),
  });
}

/**
 * Elimina una mascota
 * @param {number} id 
 * @returns {Promise<object>}
 */
export async function deletePet(id) {
  return await apiRequest(`/pets/${id}`, {
    method: 'DELETE',
  });
}


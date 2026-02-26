import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️ IMPORTANTE: Cambia esta IP por la IP de tu computadora
// En Windows: ipconfig (busca IPv4)
// Ejemplo: "http://192.168.1.8:3000"
// Si usas emulador Android en la misma PC, prueba con http://10.0.2.2:3000

const API_URL = "http://192.168.20.53:3000";

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
 * @param {string} name
 * @param {string} email 
 * @param {string} password 
 * @param {boolean} isVeterinarian - Si es true, registra como VET
 * @returns {Promise<{user: object, token: string}>}
 */
export async function register(name, email, password, isVeterinarian = false) {
  const response = await apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ 
      name, 
      email, 
      password,
      role: isVeterinarian ? 'VET' : 'USER',
    }),
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
 * @param {object} petData - { name, type, breed? }
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

// ============ PERMISSIONS ============

/**
 * Obtiene los permisos y menú según el rol del usuario
 * @returns {Promise<{role: string, permissions: string[], menu: Array}>}
 */
export async function getPermissions() {
  return await apiRequest('/users/permissions');
}

// ============ VACCINES ============

/**
 * Obtiene todas las vacunas de una mascota
 * @param {number} petId 
 * @returns {Promise<Array>}
 */
export async function getVaccinesByPet(petId) {
  return await apiRequest(`/vaccines/pet/${petId}`);
}

/**
 * Crea una nueva vacuna
 * @param {object} vaccineData - { name, petId, appliedDate, nextDose?, observations? }
 * @returns {Promise<object>}
 */
export async function createVaccine(vaccineData) {
  return await apiRequest('/vaccines', {
    method: 'POST',
    body: JSON.stringify(vaccineData),
  });
}

/**
 * Actualiza una vacuna
 * @param {number} id 
 * @param {object} vaccineData 
 * @returns {Promise<object>}
 */
export async function updateVaccine(id, vaccineData) {
  return await apiRequest(`/vaccines/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(vaccineData),
  });
}

/**
 * Elimina una vacuna
 * @param {number} id 
 * @returns {Promise<object>}
 */
export async function deleteVaccine(id) {
  return await apiRequest(`/vaccines/${id}`, {
    method: 'DELETE',
  });
}

// ============ DEWORMINGS ============

/**
 * Obtiene todos los desparasitantes de una mascota
 * @param {number} petId 
 * @returns {Promise<Array>}
 */
export async function getDewormingsByPet(petId) {
  return await apiRequest(`/dewormings/pet/${petId}`);
}

/**
 * Crea un nuevo desparasitante
 * @param {object} dewormingData - { type: 'INTERNAL'|'EXTERNAL', product, petId, appliedDate, nextDate?, observations? }
 * @returns {Promise<object>}
 */
export async function createDeworming(dewormingData) {
  return await apiRequest('/dewormings', {
    method: 'POST',
    body: JSON.stringify(dewormingData),
  });
}

/**
 * Actualiza un desparasitante
 * @param {number} id 
 * @param {object} dewormingData 
 * @returns {Promise<object>}
 */
export async function updateDeworming(id, dewormingData) {
  return await apiRequest(`/dewormings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dewormingData),
  });
}

/**
 * Elimina un desparasitante
 * @param {number} id 
 * @returns {Promise<object>}
 */
export async function deleteDeworming(id) {
  return await apiRequest(`/dewormings/${id}`, {
    method: 'DELETE',
  });
}

// ============ ALLERGIES ============

/**
 * Obtiene todas las alergias de una mascota
 * @param {number} petId 
 * @returns {Promise<Array>}
 */
export async function getAllergiesByPet(petId) {
  return await apiRequest(`/allergies/pet/${petId}`);
}

/**
 * Crea una nueva alergia
 * @param {object} allergyData - { type: 'FOOD'|'ENVIRONMENTAL'|'MEDICATION', description, severity: 'MILD'|'MODERATE'|'SEVERE', petId }
 * @returns {Promise<object>}
 */
export async function createAllergy(allergyData) {
  return await apiRequest('/allergies', {
    method: 'POST',
    body: JSON.stringify(allergyData),
  });
}

/**
 * Actualiza una alergia
 * @param {number} id 
 * @param {object} allergyData 
 * @returns {Promise<object>}
 */
export async function updateAllergy(id, allergyData) {
  return await apiRequest(`/allergies/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(allergyData),
  });
}

/**
 * Elimina una alergia
 * @param {number} id 
 * @returns {Promise<object>}
 */
export async function deleteAllergy(id) {
  return await apiRequest(`/allergies/${id}`, {
    method: 'DELETE',
  });
}

// ============ HEALTH HISTORY ============

/**
 * Obtiene todo el historial de salud de una mascota
 * @param {number} petId 
 * @returns {Promise<Array>}
 */
export async function getHealthHistoryByPet(petId) {
  return await apiRequest(`/health-history/pet/${petId}`);
}

/**
 * Crea un nuevo registro de historial de salud
 * @param {object} historyData - { petId, reason, diagnosis?, treatment?, medications?, date, veterinarian? }
 * @returns {Promise<object>}
 */
export async function createHealthHistory(historyData) {
  return await apiRequest('/health-history', {
    method: 'POST',
    body: JSON.stringify(historyData),
  });
}

/**
 * Actualiza un registro de historial de salud
 * @param {number} id 
 * @param {object} historyData 
 * @returns {Promise<object>}
 */
export async function updateHealthHistory(id, historyData) {
  return await apiRequest(`/health-history/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(historyData),
  });
}

/**
 * Elimina un registro de historial de salud
 * @param {number} id 
 * @returns {Promise<object>}
 */
export async function deleteHealthHistory(id) {
  return await apiRequest(`/health-history/${id}`, {
    method: 'DELETE',
  });
}

// ============ UPLOAD ============

/**
 * Sube una foto de mascota
 * @param {FormData} formData - FormData con campo 'photo'
 * @returns {Promise<{url: string, filename: string}>}
 */
export async function uploadPetPhoto(formData) {
  const token = await AsyncStorage.getItem('token');
  
  const response = await fetch(`${API_URL}/upload/pet-photo`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      // No incluir Content-Type, el navegador lo hará automáticamente con FormData
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error al subir la imagen' }));
    throw new Error(error.message || `Error ${response.status}`);
  }

  return await response.json();
}

// ============ REMINDERS ============

/**
 * Obtiene todos los recordatorios del usuario
 * @param {string} status - Opcional: 'PENDING', 'COMPLETED', 'POSTPONED', 'SENT'
 * @returns {Promise<Array>}
 */
export async function getReminders(status) {
  const url = status ? `/reminders?status=${status}` : '/reminders';
  return await apiRequest(url);
}

/**
 * Actualiza un recordatorio (marcar como completado, posponer, etc.)
 * @param {number} id 
 * @param {object} updateData - { status?: 'COMPLETED'|'POSTPONED', postponedTo?: 'YYYY-MM-DD' }
 * @returns {Promise<object>}
 */
export async function updateReminder(id, updateData) {
  return await apiRequest(`/reminders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updateData),
  });
}

/**
 * Elimina un recordatorio
 * @param {number} id 
 * @returns {Promise<object>}
 */
export async function deleteReminder(id) {
  return await apiRequest(`/reminders/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Genera recordatorios de prueba (solo desarrollo)
 * @returns {Promise<object>}
 */
export async function generateTestReminders() {
  return await apiRequest('/reminders/test', {
    method: 'POST',
  });
}

// ============ PUSH TOKEN ============

/**
 * Registra o actualiza el token de notificaciones push
 * @param {string} expoPushToken 
 * @returns {Promise<object>}
 */
export async function registerPushToken(expoPushToken) {
  return await apiRequest('/users/push-token', {
    method: 'POST',
    body: JSON.stringify({ expoPushToken }),
  });
}

// ============ VETERINARIANS ============

/**
 * Crea un perfil de veterinario
 * @param {object} veterinarianData 
 * @returns {Promise<object>}
 */
export async function createVeterinarian(veterinarianData) {
  return await apiRequest('/veterinarians', {
    method: 'POST',
    body: JSON.stringify(veterinarianData),
  });
}

/**
 * Busca veterinarios
 * @param {object} filters - { country?, city?, specialty?, language?, search? }
 * @returns {Promise<Array>}
 */
export async function searchVeterinarians(filters = {}) {
  const queryParams = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key]) queryParams.append(key, filters[key]);
  });
  const query = queryParams.toString();
  return await apiRequest(`/veterinarians/search${query ? `?${query}` : ''}`);
}

/**
 * Obtiene todos los veterinarios
 * @returns {Promise<Array>}
 */
export async function getVeterinarians() {
  return await apiRequest('/veterinarians');
}

/**
 * Obtiene un veterinario por ID
 * @param {number} id 
 * @returns {Promise<object>}
 */
export async function getVeterinarian(id) {
  return await apiRequest(`/veterinarians/${id}`);
}

/**
 * Obtiene el perfil del veterinario del usuario autenticado
 * @returns {Promise<object>}
 */
export async function getMyVeterinarianProfile() {
  return await apiRequest('/veterinarians/me/profile');
}

/**
 * Actualiza el perfil del veterinario
 * @param {object} updateData 
 * @returns {Promise<object>}
 */
export async function updateVeterinarianProfile(updateData) {
  return await apiRequest('/veterinarians/me', {
    method: 'PATCH',
    body: JSON.stringify(updateData),
  });
}

// ============ ADMIN - VETERINARIANS ============

/**
 * ADMIN: Obtiene veterinarios pendientes de verificación
 * @returns {Promise<Array>}
 */
export async function getPendingVeterinarians() {
  return await apiRequest('/veterinarians/admin/pending');
}

/**
 * ADMIN: Verifica (aprueba o rechaza) un veterinario
 * @param {number} veterinarianId 
 * @param {string} status - 'VERIFIED' o 'INACTIVE'
 * @param {string} notes - Notas opcionales
 * @returns {Promise<object>}
 */
export async function verifyVeterinarian(veterinarianId, status, notes = '') {
  return await apiRequest(`/veterinarians/admin/${veterinarianId}/verify`, {
    method: 'PUT',
    body: JSON.stringify({ status, notes }),
  });
}

// ============ ADMIN - PLATFORM CONFIG ============

/**
 * ADMIN: Obtiene la configuración de la plataforma
 * @returns {Promise<object>}
 */
export async function getPlatformConfig() {
  return await apiRequest('/admin/platform-config');
}

/**
 * ADMIN: Actualiza la comisión de la plataforma
 * @param {number} percentage - Porcentaje (0.15 = 15%, 0.20 = 20%, etc.)
 * @returns {Promise<object>}
 */
export async function updateCommission(percentage) {
  return await apiRequest('/admin/platform-config/commission', {
    method: 'PUT',
    body: JSON.stringify({ percentage }),
  });
}

// ============ CONSULTATIONS ============

/**
 * Crea una nueva consulta
 * @param {object} consultationData - { type: 'CHAT'|'VOICE'|'VIDEO', veterinarianId: number, petId?: number }
 * @returns {Promise<object>}
 */
export async function createConsultation(consultationData) {
  return await apiRequest('/consultations', {
    method: 'POST',
    body: JSON.stringify(consultationData),
  });
}

/**
 * Obtiene las consultas del usuario
 * @returns {Promise<Array>}
 */
export async function getMyConsultations() {
  return await apiRequest('/consultations');
}

/**
 * Obtiene una consulta por ID
 * @param {number} id 
 * @returns {Promise<object>}
 */
export async function getConsultation(id) {
  return await apiRequest(`/consultations/${id}`);
}

/**
 * Acepta una consulta (solo veterinario)
 * @param {number} id 
 * @returns {Promise<object>}
 */
export async function acceptConsultation(id) {
  return await apiRequest(`/consultations/${id}/accept`, {
    method: 'PATCH',
  });
}

/**
 * Inicia una consulta
 * @param {number} id 
 * @param {boolean} isVet 
 * @returns {Promise<object>}
 */
export async function startConsultation(id, isVet = false) {
  return await apiRequest(`/consultations/${id}/start`, {
    method: 'PATCH',
    body: JSON.stringify({ isVet }),
  });
}

/**
 * Finaliza una consulta
 * @param {number} id 
 * @param {boolean} isVet 
 * @returns {Promise<object>}
 */
export async function finishConsultation(id, isVet = false) {
  return await apiRequest(`/consultations/${id}/finish`, {
    method: 'PATCH',
    body: JSON.stringify({ isVet }),
  });
}

/**
 * Califica una consulta
 * @param {number} id 
 * @param {object} ratingData - { rating: 1-5, comment?: string }
 * @returns {Promise<object>}
 */
export async function rateConsultation(id, ratingData) {
  return await apiRequest(`/consultations/${id}/rate`, {
    method: 'POST',
    body: JSON.stringify(ratingData),
  });
}

// ============ PAYMENTS ============

/**
 * Crea un pago para una consulta
 * @param {number} consultationId 
 * @param {string} redirectUrl - URL de redirección después del pago
 * @returns {Promise<{payment: object, checkoutUrl: string}>}
 */
export async function createPayment(consultationId, redirectUrl) {
  return await apiRequest('/marketplace/payments/create', {
    method: 'POST',
    body: JSON.stringify({ consultationId, redirectUrl }),
  });
}

// ============ COMMUNITY ============

/**
 * Obtiene todos los posts de la comunidad
 * @param {object} query - { page?: number, limit?: number, type?: string, visibility?: string, search?: string, tag?: string }
 * @returns {Promise<{data: Array, total: number, page: number, lastPage: number}>}
 */
export async function getCommunityPosts(query = {}) {
  const params = new URLSearchParams();
  if (query.page) params.append('page', query.page);
  if (query.limit) params.append('limit', query.limit);
  if (query.type) params.append('type', query.type);
  if (query.visibility) params.append('visibility', query.visibility);
  if (query.search) params.append('search', query.search);
  if (query.tag) params.append('tag', query.tag);
  
  const queryString = params.toString();
  return await apiRequest(`/community/posts${queryString ? `?${queryString}` : ''}`);
}

/**
 * Obtiene un post por ID
 * @param {number} postId 
 * @returns {Promise<object>}
 */
export async function getCommunityPost(postId) {
  return await apiRequest(`/community/posts/${postId}`);
}

/**
 * Crea un nuevo post (solo veterinarios)
 * @param {object} postData - { type, title, visibility?, ... }
 * @returns {Promise<object>}
 */
export async function createCommunityPost(postData) {
  return await apiRequest('/community/posts', {
    method: 'POST',
    body: JSON.stringify(postData),
  });
}

/**
 * Crea un comentario en un post
 * @param {number} postId 
 * @param {object} commentData - { content, parentId?: number }
 * @returns {Promise<object>}
 */
export async function createComment(postId, commentData) {
  return await apiRequest(`/community/posts/${postId}/comment`, {
    method: 'POST',
    body: JSON.stringify(commentData),
  });
}

/**
 * Like/Unlike un post
 * @param {number} postId 
 * @returns {Promise<{liked: boolean}>}
 */
export async function togglePostLike(postId) {
  return await apiRequest(`/community/posts/${postId}/like`, {
    method: 'POST',
  });
}

/**
 * Agregar/Quitar de favoritos un post
 * @param {number} postId 
 * @returns {Promise<{favorited: boolean}>}
 */
export async function togglePostFavorite(postId) {
  return await apiRequest(`/community/posts/${postId}/favorite`, {
    method: 'POST',
  });
}

/**
 * Seguir/Dejar de seguir un veterinario
 * @param {number} vetId 
 * @returns {Promise<{following: boolean}>}
 */
export async function followVeterinarian(vetId) {
  return await apiRequest(`/community/follow/${vetId}`, {
    method: 'POST',
  });
}

/**
 * Reportar un post
 * @param {number} postId 
 * @param {object} reportData - { reason: string }
 * @returns {Promise<object>}
 */
export async function reportPost(postId, reportData) {
  return await apiRequest(`/community/posts/${postId}/report`, {
    method: 'POST',
    body: JSON.stringify(reportData),
  });
}

/**
 * Marcar un comentario como útil
 * @param {number} commentId 
 * @returns {Promise<{helpful: boolean}>}
 */
export async function markCommentAsHelpful(commentId) {
  return await apiRequest(`/community/comments/${commentId}/helpful`, {
    method: 'POST',
  });
}
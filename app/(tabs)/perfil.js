import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Switch,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  SafeAreaView,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import * as api from '../../services/api';

const SPECIALTIES = {
  GENERAL: 'General',
  DERMATOLOGY: 'Dermatología',
  NUTRITION: 'Nutrición',
  SURGERY: 'Cirugía',
  CARDIOLOGY: 'Cardiología',
  ONCOLOGY: 'Oncología',
  ORTHOPEDICS: 'Ortopedia',
  BEHAVIOR: 'Comportamiento',
  EMERGENCY: 'Emergencias',
};

export default function PerfilScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [notificaciones, setNotificaciones] = useState(false);
  const [loading, setLoading] = useState(true);
  const [veterinarianProfile, setVeterinarianProfile] = useState(null);
  const [userPets, setUserPets] = useState([]);

  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, [user])
  );

  const loadProfileData = async () => {
    try {
      setLoading(true);
      
      // Cargar mascotas del usuario
      const pets = await api.getPets();
      setUserPets(pets);

      // Si el usuario es VET, cargar perfil de veterinario
      if (user?.role === 'VET') {
        try {
          const vetProfile = await api.getMyVeterinarianProfile();
          setVeterinarianProfile(vetProfile);
        } catch (error) {
          // Si no tiene perfil de veterinario, no es error
          setVeterinarianProfile(null);
        }
      }
    } catch (error) {
      console.error('Error cargando perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/login');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B7FA8" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.profileHeader}>
        {veterinarianProfile?.profilePhoto ? (
          <Image
            source={{ uri: veterinarianProfile.profilePhoto }}
            style={styles.profilePhoto}
          />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
        )}
        <Text style={styles.name}>
          {veterinarianProfile?.fullName || user?.name || 'Usuario'}
        </Text>
        {veterinarianProfile && (
          <Text style={styles.vetBadge}>👨‍⚕️ Veterinario</Text>
        )}
        <Text style={styles.email}>{user?.email || 'N/A'}</Text>
      </View>

      <View style={styles.formContainer}>
        {/* Información del Veterinario */}
        {veterinarianProfile && (
          <>
            <View style={styles.sectionTitle}>
              <Text style={styles.sectionTitleText}>Información Profesional</Text>
            </View>
            
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Especialidad</Text>
              <Text style={styles.infoValue}>
                {SPECIALTIES[veterinarianProfile.specialty] || veterinarianProfile.specialty}
              </Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Años de Experiencia</Text>
              <Text style={styles.infoValue}>
                {veterinarianProfile.yearsExperience} años
              </Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Ubicación</Text>
              <Text style={styles.infoValue}>
                {veterinarianProfile.city}, {veterinarianProfile.country}
              </Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Idiomas</Text>
              <Text style={styles.infoValue}>
                {veterinarianProfile.languages?.join(', ') || 'N/A'}
              </Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Precios por Consulta</Text>
              <Text style={styles.infoValue}>
                💬 Chat: ${(veterinarianProfile.priceChat || 0).toFixed(2)}
              </Text>
              <Text style={styles.infoValue}>
                📞 Voz: ${(veterinarianProfile.priceVoice || 0).toFixed(2)}
              </Text>
              <Text style={styles.infoValue}>
                📹 Video: ${(veterinarianProfile.priceVideo || 0).toFixed(2)}
              </Text>
              {!veterinarianProfile.priceChat && !veterinarianProfile.priceVoice && !veterinarianProfile.priceVideo && veterinarianProfile.pricePerConsultation && (
                <Text style={styles.infoValue}>
                  Precio: ${(veterinarianProfile.pricePerConsultation || 0).toFixed(2)}
                </Text>
              )}
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Estado</Text>
              <Text style={styles.infoValue}>
                {veterinarianProfile.status === 'PENDING' && '⏳ Pendiente de verificación'}
                {veterinarianProfile.status === 'ACTIVE' && '✅ Activo'}
                {veterinarianProfile.status === 'VERIFIED' && '✅ Verificado'}
                {veterinarianProfile.status === 'INACTIVE' && '❌ Inactivo'}
              </Text>
            </View>

            {veterinarianProfile.professionalDescription && (
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Descripción Profesional</Text>
                <Text style={styles.infoValue}>
                  {veterinarianProfile.professionalDescription}
                </Text>
              </View>
            )}

            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Consultas Realizadas</Text>
              <Text style={styles.infoValue}>
                {veterinarianProfile.totalConsultations || 0} consultas
              </Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Calificación Promedio</Text>
              <Text style={styles.infoValue}>
                {veterinarianProfile.averageRating && veterinarianProfile.averageRating > 0
                  ? `⭐ ${(veterinarianProfile.averageRating || 0).toFixed(1)} / 5.0`
                  : 'Sin calificaciones aún'}
              </Text>
            </View>

            {/* Botón de editar perfil */}
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => router.push('/veterinario/editar-perfil')}
            >
              <Text style={styles.editButtonText}>✏️ Editar Perfil</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Información del Usuario */}
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>Información Personal</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{user?.email || 'N/A'}</Text>
        </View>

        {user?.name && (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Nombre</Text>
            <Text style={styles.infoValue}>{user.name}</Text>
          </View>
        )}

        {user?.phone && (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Teléfono</Text>
            <Text style={styles.infoValue}>{user.phone}</Text>
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Mascotas registradas</Text>
          <Text style={styles.infoValue}>
            {userPets.length} mascota(s)
          </Text>
        </View>

        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Notificaciones</Text>
          <Switch
            value={notificaciones}
            onValueChange={setNotificaciones}
            trackColor={{ false: '#E0E0E0', true: '#8B7FA8' }}
            thumbColor={notificaciones ? '#FFFFFF' : '#F4F3F4'}
          />
        </View>
      </View>

      {/* Comunidad Veterinaria */}
      <View style={styles.communitySection}>
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>Comunidad</Text>
        </View>
        <TouchableOpacity
          style={styles.communityButton}
          onPress={() => router.push('/community')}
        >
          <Text style={styles.communityButtonText}>👥 Comunidad Veterinaria</Text>
          <Text style={styles.communityButtonSubtext}>
            Comparte casos clínicos, discusiones y artículos
          </Text>
        </TouchableOpacity>
      </View>

      {/* Panel de Admin - Solo visible para ADMIN */}
      {user?.role === 'ADMIN' && (
        <View style={styles.adminSection}>
          <View style={styles.sectionTitle}>
            <Text style={styles.sectionTitleText}>Panel de Administración</Text>
          </View>
          <TouchableOpacity
            style={styles.adminButton}
            onPress={() => router.push('/admin/validar-veterinarios')}
          >
            <Text style={styles.adminButtonText}>👨‍💼 Validar Veterinarios</Text>
            <Text style={styles.adminButtonSubtext}>
              Revisar y aprobar veterinarios pendientes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.adminButton}
            onPress={() => router.push('/admin/configurar-comision')}
          >
            <Text style={styles.adminButtonText}>💰 Configurar Comisión</Text>
            <Text style={styles.adminButtonSubtext}>
              Establecer porcentaje de comisión de la plataforma
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
      </TouchableOpacity>

      <View style={styles.legalContainer}>
        <Text style={styles.legalText}>
          NALA no reemplaza la atención veterinaria profesional.
        </Text>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#8B7FA8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  profilePhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  vetBadge: {
    fontSize: 14,
    color: '#8B7FA8',
    fontWeight: '600',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#666',
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitleText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B7FA8',
  },
  formContainer: {
    marginBottom: 30,
  },
  infoCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  legalContainer: {
    marginTop: 40,
    padding: 16,
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  legalText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  adminSection: {
    marginTop: 24,
    marginBottom: 20,
  },
  adminButton: {
    backgroundColor: '#8B7FA8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  adminButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  adminButtonSubtext: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.9,
  },
  editButton: {
    backgroundColor: '#8B7FA8',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#FF5252',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  communitySection: {
    marginTop: 24,
    marginBottom: 20,
  },
  communityButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  communityButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  communityButtonSubtext: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.9,
  },
});

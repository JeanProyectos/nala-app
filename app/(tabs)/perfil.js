import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Switch,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import * as api from '../../services/api';
import AnimatedButton from '../../components/AnimatedButton';
import AnimatedCard from '../../components/AnimatedCard';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../../styles/theme';
import { formatPrice } from '../../utils/formatPrice';

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
      <AnimatedCard style={styles.profileHeader}>
        {veterinarianProfile?.profilePhoto || user?.photo ? (
          <Image
            source={{ uri: veterinarianProfile?.profilePhoto || user?.photo }}
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
      </AnimatedCard>

      <View style={styles.formContainer}>
        {/* Información del Veterinario */}
        {veterinarianProfile && (
          <>
            <View style={styles.sectionTitle}>
              <Text style={styles.sectionTitleText}>Información Profesional</Text>
            </View>
            
            <AnimatedCard style={styles.infoCard}>
              <Text style={styles.infoLabel}>Especialidad</Text>
              <Text style={styles.infoValue}>
                {SPECIALTIES[veterinarianProfile.specialty] || veterinarianProfile.specialty}
              </Text>
            </AnimatedCard>

            <AnimatedCard style={styles.infoCard}>
              <Text style={styles.infoLabel}>Años de Experiencia</Text>
              <Text style={styles.infoValue}>
                {veterinarianProfile.yearsExperience} años
              </Text>
            </AnimatedCard>

            <AnimatedCard style={styles.infoCard}>
              <Text style={styles.infoLabel}>Ubicación</Text>
              <Text style={styles.infoValue}>
                {veterinarianProfile.city}, {veterinarianProfile.country}
              </Text>
            </AnimatedCard>

            <AnimatedCard style={styles.infoCard}>
              <Text style={styles.infoLabel}>Idiomas</Text>
              <Text style={styles.infoValue}>
                {veterinarianProfile.languages?.join(', ') || 'N/A'}
              </Text>
            </AnimatedCard>

            <AnimatedCard style={styles.infoCard}>
              <Text style={styles.infoLabel}>Precios por Consulta</Text>
              <Text style={styles.infoValue}>
                💬 Chat: ${formatPrice(veterinarianProfile.priceChat || 0)}
              </Text>
              <Text style={styles.infoValue}>
                📞 Voz: ${formatPrice(veterinarianProfile.priceVoice || 0)}
              </Text>
              <Text style={styles.infoValue}>
                📹 Video: ${formatPrice(veterinarianProfile.priceVideo || 0)}
              </Text>
              {!veterinarianProfile.priceChat && !veterinarianProfile.priceVoice && !veterinarianProfile.priceVideo && veterinarianProfile.pricePerConsultation && (
                <Text style={styles.infoValue}>
                  Precio: ${formatPrice(veterinarianProfile.pricePerConsultation || 0)}
                </Text>
              )}
            </AnimatedCard>

            <AnimatedCard style={styles.infoCard}>
              <Text style={styles.infoLabel}>Estado de Verificación</Text>
              <Text style={styles.infoValue}>
                {veterinarianProfile.status === 'PENDING' && '⏳ Pendiente de verificación'}
                {veterinarianProfile.status === 'ACTIVE' && '✅ Activo'}
                {veterinarianProfile.status === 'VERIFIED' && '✅ Verificado'}
                {veterinarianProfile.status === 'INACTIVE' && '❌ Inactivo'}
              </Text>
            </AnimatedCard>

            <AnimatedCard style={styles.infoCard}>
              <Text style={styles.infoLabel}>Disponibilidad</Text>
              <View style={styles.availabilitySection}>
                <View style={[
                  styles.availabilityBadge,
                  veterinarianProfile.availabilityStatus === 'AVAILABLE' && styles.availabilityAvailable,
                  veterinarianProfile.availabilityStatus === 'IN_CONSULTATION' && styles.availabilityInConsultation,
                  veterinarianProfile.availabilityStatus === 'UNAVAILABLE' && styles.availabilityUnavailable,
                ]}>
                  <Text style={styles.availabilityText}>
                    {veterinarianProfile.availabilityStatus === 'AVAILABLE' && '🟢 Disponible'}
                    {veterinarianProfile.availabilityStatus === 'IN_CONSULTATION' && '🟡 En Consulta'}
                    {veterinarianProfile.availabilityStatus === 'UNAVAILABLE' && '🔴 No Disponible'}
                  </Text>
                </View>
                <View style={styles.availabilityButtons}>
                  <TouchableOpacity
                    style={[
                      styles.availabilityButton,
                      veterinarianProfile.availabilityStatus === 'AVAILABLE' && styles.availabilityButtonActive
                    ]}
                    onPress={async () => {
                      try {
                        await api.updateAvailabilityStatus('AVAILABLE');
                        await loadProfileData();
                        Alert.alert('Éxito', 'Estado actualizado a Disponible');
                      } catch (error) {
                        Alert.alert('Error', error.message || 'No se pudo actualizar el estado');
                      }
                    }}
                  >
                    <Text style={[
                      styles.availabilityButtonText,
                      veterinarianProfile.availabilityStatus === 'AVAILABLE' && styles.availabilityButtonTextActive
                    ]}>
                      Disponible
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.availabilityButton,
                      veterinarianProfile.availabilityStatus === 'UNAVAILABLE' && styles.availabilityButtonActive
                    ]}
                    onPress={async () => {
                      try {
                        await api.updateAvailabilityStatus('UNAVAILABLE');
                        await loadProfileData();
                        Alert.alert('Éxito', 'Estado actualizado a No Disponible');
                      } catch (error) {
                        Alert.alert('Error', error.message || 'No se pudo actualizar el estado');
                      }
                    }}
                  >
                    <Text style={[
                      styles.availabilityButtonText,
                      veterinarianProfile.availabilityStatus === 'UNAVAILABLE' && styles.availabilityButtonTextActive
                    ]}>
                      No Disponible
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.availabilityNote}>
                  💡 El estado "En Consulta" se actualiza automáticamente cuando tienes consultas activas
                </Text>
              </View>
            </AnimatedCard>

            {veterinarianProfile.professionalDescription && (
              <AnimatedCard style={styles.infoCard}>
                <Text style={styles.infoLabel}>Descripción Profesional</Text>
                <Text style={styles.infoValue}>
                  {veterinarianProfile.professionalDescription}
                </Text>
              </AnimatedCard>
            )}

            <AnimatedCard style={styles.infoCard}>
              <Text style={styles.infoLabel}>Consultas Realizadas</Text>
              <Text style={styles.infoValue}>
                {veterinarianProfile.totalConsultations || 0} consultas
              </Text>
            </AnimatedCard>

            <AnimatedCard style={styles.infoCard}>
              <Text style={styles.infoLabel}>Calificación Promedio</Text>
              <Text style={styles.infoValue}>
                {veterinarianProfile.averageRating && veterinarianProfile.averageRating > 0
                  ? `⭐ ${(veterinarianProfile.averageRating || 0).toFixed(1)} / 5.0`
                  : 'Sin calificaciones aún'}
              </Text>
            </AnimatedCard>

            {/* Botón de editar perfil */}
            <AnimatedButton
              style={styles.editButton}
              onPress={() => router.push('/veterinario/editar-perfil')}
            >
              <Text style={styles.editButtonText}>✏️ Editar Perfil</Text>
            </AnimatedButton>

            {/* Botón de configurar pagos */}
            <AnimatedCard style={styles.infoCard}>
              <Text style={styles.infoLabel}>Configuración de Pagos</Text>
              <Text style={styles.infoValue}>
                {veterinarianProfile.wompiSubaccountId 
                  ? `✅ Cuenta configurada: ${veterinarianProfile.wompiAccountStatus || 'PENDING'}`
                  : '⚠️ No has configurado tu cuenta bancaria'}
              </Text>
              <AnimatedButton
                style={styles.paymentButton}
                onPress={() => router.push('/veterinario/configurar-pagos')}
              >
                <Text style={styles.paymentButtonText}>
                  {veterinarianProfile.wompiSubaccountId 
                    ? '🔧 Ver/Actualizar Datos Bancarios'
                    : '💳 Configurar Datos Bancarios'}
                </Text>
              </AnimatedButton>
            </AnimatedCard>
          </>
        )}

        {/* Información del Usuario */}
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>Información Personal</Text>
        </View>

        {user?.role !== 'VET' && (
          <AnimatedButton
            style={styles.editUserButton}
            onPress={() => router.push('/editar-perfil-usuario')}
          >
            <Text style={styles.editUserButtonText}>✏️ Editar mi perfil</Text>
          </AnimatedButton>
        )}

        <AnimatedCard style={styles.infoCard}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{user?.email || 'N/A'}</Text>
        </AnimatedCard>

        {user?.name && (
          <AnimatedCard style={styles.infoCard}>
            <Text style={styles.infoLabel}>Nombre</Text>
            <Text style={styles.infoValue}>{user.name}</Text>
          </AnimatedCard>
        )}

        {user?.phone && (
          <AnimatedCard style={styles.infoCard}>
            <Text style={styles.infoLabel}>Teléfono</Text>
            <Text style={styles.infoValue}>{user.phone}</Text>
          </AnimatedCard>
        )}

        <AnimatedCard style={styles.infoCard}>
          <Text style={styles.infoLabel}>Mascotas registradas</Text>
          <Text style={styles.infoValue}>
            {userPets.length} mascota(s)
          </Text>
        </AnimatedCard>

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
        <AnimatedButton
          style={styles.communityButton}
          onPress={() => router.push('/community')}
        >
          <Text style={styles.communityButtonText}>👥 Comunidad Veterinaria</Text>
          <Text style={styles.communityButtonSubtext}>
            Comparte casos clínicos, discusiones y artículos
          </Text>
        </AnimatedButton>
      </View>

      {/* Panel de Admin - Solo visible para ADMIN */}
      {user?.role === 'ADMIN' && (
        <View style={styles.adminSection}>
          <View style={styles.sectionTitle}>
            <Text style={styles.sectionTitleText}>Panel de Administración</Text>
          </View>
          <AnimatedButton
            style={styles.adminButton}
            onPress={() => router.push('/admin/validar-veterinarios')}
          >
            <Text style={styles.adminButtonText}>👨‍💼 Validar Veterinarios</Text>
            <Text style={styles.adminButtonSubtext}>
              Revisar y aprobar veterinarios pendientes
            </Text>
          </AnimatedButton>
          <AnimatedButton
            style={styles.adminButton}
            onPress={() => router.push('/admin/configurar-comision')}
          >
            <Text style={styles.adminButtonText}>💰 Configurar Comisión</Text>
            <Text style={styles.adminButtonSubtext}>
              Establecer porcentaje de comisión de la plataforma
            </Text>
          </AnimatedButton>
        </View>
      )}

      <AnimatedButton style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
      </AnimatedButton>

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
    backgroundColor: COLORS.backgroundSecondary,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },
  content: {
    padding: SPACING.xl,
    paddingBottom: SPACING.xxxl + 80, // Espacio para el tabBar
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: SPACING.xxxl,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xxl,
    ...SHADOWS.lg,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  profilePhoto: {
    width: 96,
    height: 96,
    borderRadius: BORDER_RADIUS.round,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: COLORS.textWhite,
  },
  name: {
    ...TYPOGRAPHY.h4,
    marginBottom: SPACING.xs,
  },
  vetBadge: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  email: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  sectionTitle: {
    marginTop: SPACING.xxl,
    marginBottom: SPACING.md,
  },
  sectionTitleText: {
    ...TYPOGRAPHY.h4,
    color: COLORS.primary,
  },
  formContainer: {
    marginBottom: SPACING.xxxl,
  },
  infoCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  infoLabel: {
    ...TYPOGRAPHY.caption,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    ...TYPOGRAPHY.bodyBold,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xxl,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  switchLabel: {
    ...TYPOGRAPHY.bodyBold,
  },
  legalContainer: {
    marginTop: SPACING.huge,
    padding: SPACING.lg,
    backgroundColor: '#FFF9E6',
    borderRadius: BORDER_RADIUS.lg,
    borderLeftWidth: 5,
    borderLeftColor: COLORS.accentYellow,
    ...SHADOWS.sm,
  },
  legalText: {
    ...TYPOGRAPHY.caption,
    lineHeight: 20,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  adminSection: {
    marginTop: SPACING.xxl,
    marginBottom: SPACING.xl,
  },
  adminButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  adminButtonText: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textWhite,
    marginBottom: SPACING.xs,
  },
  adminButtonSubtext: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textWhite,
    opacity: 0.9,
  },
  editButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    marginTop: SPACING.md,
    ...SHADOWS.md,
  },
  editButtonText: {
    ...TYPOGRAPHY.button,
  },
  editUserButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  editUserButtonText: {
    ...TYPOGRAPHY.button,
  },
  logoutButton: {
    backgroundColor: COLORS.accentRed,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    marginTop: SPACING.xl,
    ...SHADOWS.md,
  },
  logoutButtonText: {
    ...TYPOGRAPHY.button,
  },
  communitySection: {
    marginTop: SPACING.xxl,
    marginBottom: SPACING.xl,
  },
  communityButton: {
    backgroundColor: COLORS.accentGreen,
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  communityButtonText: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textWhite,
    marginBottom: SPACING.xs,
  },
  communityButtonSubtext: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textWhite,
    opacity: 0.9,
  },
  paymentButton: {
    backgroundColor: COLORS.accentGreen,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
    ...SHADOWS.sm,
  },
  paymentButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textWhite,
  },
  availabilitySection: {
    marginTop: SPACING.sm,
  },
  availabilityBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignSelf: 'flex-start',
    marginBottom: SPACING.md,
  },
  availabilityAvailable: {
    backgroundColor: '#E8F5E9',
  },
  availabilityInConsultation: {
    backgroundColor: '#FFF9E6',
  },
  availabilityUnavailable: {
    backgroundColor: '#FFEBEE',
  },
  availabilityText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 14,
  },
  availabilityButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  availabilityButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.backgroundTertiary,
  },
  availabilityButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  availabilityButtonText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textSecondary,
  },
  availabilityButtonTextActive: {
    color: COLORS.textWhite,
  },
  availabilityNote: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: SPACING.xs,
  },
});

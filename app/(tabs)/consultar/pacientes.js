import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import AnimatedButton from '../../../components/AnimatedButton';
import AnimatedCard from '../../../components/AnimatedCard';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../../../styles/theme';

export default function PacientesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(
    typeof params.filter === 'string' ? params.filter : 'all'
  ); // all, active, finished

  useEffect(() => {
    if (typeof params.filter === 'string') {
      setFilter(params.filter);
    }
  }, [params.filter]);

  useFocusEffect(
    useCallback(() => {
      loadConsultations();
    }, [filter])
  );

  const loadConsultations = async () => {
    try {
      setLoading(true);
      // El endpoint getMyConsultations ahora devuelve las consultas del veterinario
      // si el usuario es VET, o las consultas del usuario si es USER
      const allConsultations = await api.getMyConsultations();
      
      // Verificar que sea un array
      if (!Array.isArray(allConsultations)) {
        console.error('Error: getMyConsultations no devolvió un array:', allConsultations);
        setConsultations([]);
        return;
      }
      
      // Filtrar por estado
      let filtered = allConsultations;
      if (filter === 'active') {
        filtered = allConsultations.filter(c => 
          c.status === 'IN_PROGRESS' || 
          c.status === 'ACTIVE' || 
          c.status === 'PENDING_APPROVAL'
        );
      } else if (filter === 'finished') {
        filtered = allConsultations.filter(c => 
          c.status === 'FINISHED' || 
          c.status === 'REJECTED' || 
          c.status === 'CANCELLED'
        );
      }

      setConsultations(filtered);
    } catch (error) {
      console.error('Error cargando consultas:', error);
      const errorMessage = error.message || 'No se pudieron cargar las consultas';
      Alert.alert('Error', errorMessage);
      setConsultations([]); // Asegurar que el estado sea un array vacío
    } finally {
      setLoading(false);
    }
  };

  const handleViewConsultation = (consultation) => {
    router.push(`consulta-chat?id=${consultation.id}`);
  };

  const handleAcceptConsultation = async (consultationId) => {
    try {
      const result = await api.acceptConsultation(consultationId);
      const consultation = consultations.find(c => c.id === consultationId);
      const consultationType = consultation?.type || 'CHAT';
      
      if (consultationType === 'VOICE' || consultationType === 'VIDEO') {
        Alert.alert(
          'Consulta aceptada',
          'La llamada se iniciará automáticamente.',
          [
            {
              text: 'OK',
              onPress: () => {
                loadConsultations();
                // Navegar al chat donde se iniciará la llamada automáticamente
                router.push(`consulta-chat?id=${consultationId}`);
              }
            }
          ]
        );
      } else {
        Alert.alert('Éxito', 'Consulta aceptada. Puedes comenzar a chatear.');
        loadConsultations();
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo aceptar la consulta');
    }
  };

  const handleRejectConsultation = async (consultationId) => {
    Alert.alert(
      'Rechazar consulta',
      '¿Estás seguro de que deseas rechazar esta consulta?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Rechazar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.rejectConsultation(consultationId);
              Alert.alert('Éxito', 'Consulta rechazada.');
              loadConsultations();
            } catch (error) {
              Alert.alert('Error', error.message || 'No se pudo rechazar la consulta');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING_PAYMENT':
        return '#FF9800';
      case 'PENDING_APPROVAL':
        return '#2196F3';
      case 'PENDING':
        return '#FF9800';
      case 'IN_PROGRESS':
        return '#4CAF50';
      case 'ACTIVE':
        return '#4CAF50';
      case 'FINISHED':
        return '#9E9E9E';
      case 'CANCELLED':
        return '#F44336';
      case 'REJECTED':
        return '#F44336';
      default:
        return '#666';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'PENDING_PAYMENT':
        return 'Esperando pago';
      case 'PENDING_APPROVAL':
        return user?.role === 'VET'
          ? 'Pendiente por aceptar'
          : 'Pendiente de aprobación del veterinario';
      case 'PENDING':
        return 'Esperando respuesta';
      case 'IN_PROGRESS':
        return 'En curso';
      case 'ACTIVE':
        return 'Activa';
      case 'FINISHED':
        return 'Completada';
      case 'CANCELLED':
        return 'Cancelada';
      case 'REJECTED':
        return 'Rechazada';
      default:
        return status;
    }
  };

  const groupConsultationsByDate = (consultations) => {
    const groups = {};
    consultations.forEach((consultation) => {
      const date = new Date(consultation.createdAt);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const consultationDate = new Date(date);
      consultationDate.setHours(0, 0, 0, 0);
      
      const diffTime = today.getTime() - consultationDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      let groupKey;
      if (diffDays === 0) {
        groupKey = 'Hoy';
      } else if (diffDays === 1) {
        groupKey = 'Ayer';
      } else if (diffDays < 7) {
        groupKey = 'Esta semana';
      } else if (diffDays < 30) {
        groupKey = 'Este mes';
      } else {
        groupKey = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(consultation);
    });
    
    return groups;
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'CHAT':
        return '💬';
      case 'VOICE':
        return '📞';
      case 'VIDEO':
        return '📹';
      default:
        return '💬';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
      {/* Filtros */}
      <View style={styles.filters}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            Todas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'active' && styles.filterButtonActive]}
          onPress={() => setFilter('active')}
        >
          <Text style={[styles.filterText, filter === 'active' && styles.filterTextActive]}>
            Activas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'finished' && styles.filterButtonActive]}
          onPress={() => setFilter('finished')}
        >
          <Text style={[styles.filterText, filter === 'finished' && styles.filterTextActive]}>
            Finalizadas
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : consultations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyText}>Aún no tienes consultas</Text>
          <Text style={styles.emptySubtext}>
            Cuando hables con un veterinario, tus conversaciones aparecerán aquí organizadas por fecha
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.listContainer}>
          {Object.entries(groupConsultationsByDate(consultations)).map(([groupKey, groupConsultations]) => (
            <View key={groupKey} style={styles.dateGroup}>
              <Text style={styles.dateGroupTitle}>{groupKey}</Text>
              {groupConsultations.map((consultation) => (
                <AnimatedCard
                  key={consultation.id}
                  style={styles.consultationCard}
                  onPress={() => handleViewConsultation(consultation)}
                >
                  <View style={styles.cardHeader}>
                    {consultation.pet?.photo ? (
                      <Image
                        source={{ uri: consultation.pet.photo }}
                        style={styles.petPhoto}
                        onError={() => {
                          // Si la imagen falla, no hacer nada (ya hay placeholder)
                        }}
                      />
                    ) : (
                      <View style={styles.petPhotoPlaceholder}>
                        <Text style={styles.petPhotoIcon}>🐾</Text>
                      </View>
                    )}
                    <View style={styles.cardInfo}>
                      <Text style={styles.consultationPurpose}>
                        {consultation.pet ? `Consulta sobre ${consultation.pet.name}` : 'Consulta general'}
                      </Text>
                      <Text style={styles.consultationDate}>
                        {new Date(consultation.createdAt).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                      <View style={styles.cardMeta}>
                        <Text style={styles.consultationType}>
                          {getTypeIcon(consultation.type)} {consultation.type === 'CHAT' ? 'Chat' : consultation.type}
                        </Text>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: getStatusColor(consultation.status) },
                          ]}
                        >
                          <Text style={styles.statusText}>
                            {getStatusLabel(consultation.status)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  {/* Solo el veterinario puede aceptar o rechazar la consulta */}
                  {user?.role === 'VET' && consultation.status === 'PENDING_APPROVAL' && (
                    <View style={styles.actionButtons}>
                      <AnimatedButton
                        style={[styles.actionButton, styles.rejectButton]}
                        onPress={() => handleRejectConsultation(consultation.id)}
                      >
                        <Text style={styles.rejectButtonText}>Rechazar</Text>
                      </AnimatedButton>
                      <AnimatedButton
                        style={[styles.actionButton, styles.acceptButton]}
                        onPress={() => handleAcceptConsultation(consultation.id)}
                      >
                        <Text style={styles.acceptButtonText}>Aceptar</Text>
                      </AnimatedButton>
                    </View>
                  )}
                  {/* Botón para aceptar consultas pendientes de pago (compatibilidad) */}
                  {user?.role === 'VET' && consultation.status === 'PENDING_PAYMENT' && (
                    <AnimatedButton
                      style={styles.acceptButton}
                      onPress={() => handleAcceptConsultation(consultation.id)}
                    >
                      <Text style={styles.acceptButtonText}>Aceptar consulta</Text>
                    </AnimatedButton>
                  )}
                </AnimatedCard>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
      </View>
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
  filters: {
    flexDirection: 'row',
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  filterButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.backgroundTertiary,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#E8F5E9',
    borderColor: COLORS.primary,
  },
  filterText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '500',
  },
  filterTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.huge,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: SPACING.lg,
  },
  emptyText: {
    ...TYPOGRAPHY.h4,
    marginBottom: SPACING.sm,
  },
  emptySubtext: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContainer: {
    flex: 1,
    padding: SPACING.lg,
  },
  dateGroup: {
    marginBottom: SPACING.xl,
  },
  dateGroupTitle: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  consultationCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  petPhoto: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.round,
    marginRight: SPACING.md,
  },
  petPhotoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  petPhotoIcon: {
    fontSize: 28,
  },
  cardInfo: {
    flex: 1,
  },
  consultationPurpose: {
    ...TYPOGRAPHY.bodyBold,
    marginBottom: SPACING.xs,
  },
  consultationDate: {
    ...TYPOGRAPHY.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  consultationType: {
    ...TYPOGRAPHY.small,
    color: COLORS.primary,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  statusText: {
    ...TYPOGRAPHY.small,
    color: COLORS.textWhite,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  actionButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  acceptButton: {
    backgroundColor: COLORS.accentGreen,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    ...SHADOWS.sm,
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  acceptButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textWhite,
  },
  rejectButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textWhite,
  },
});

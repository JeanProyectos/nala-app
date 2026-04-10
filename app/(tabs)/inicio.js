import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as api from '../../services/api';
import AnimatedButton from '../../components/AnimatedButton';
import AnimatedCard from '../../components/AnimatedCard';
import RunningPetsBanner from '../../components/RunningPetsBanner';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../../styles/theme';

export default function InicioScreen() {
  const router = useRouter();
  const [pets, setPets] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [vaccines, setVaccines] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const [petsData, remindersData, consultationsData] = await Promise.all([
        api.getPets(),
        api.getReminders('PENDING'),
        api.getMyConsultations(),
      ]);

      setPets(petsData);
      setReminders(remindersData);
      setConsultations(Array.isArray(consultationsData) ? consultationsData : []);

      // Obtener próxima vacuna de la primera mascota
      if (petsData.length > 0) {
        const vaccinesData = await api.getVaccinesByPet(petsData[0].id);
        const upcomingVaccines = vaccinesData
          .filter((v) => v.nextDose && new Date(v.nextDose) > new Date())
          .sort((a, b) => new Date(a.nextDose) - new Date(b.nextDose));
        setVaccines(upcomingVaccines.slice(0, 1));
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNextReminder = () => {
    if (reminders.length === 0) return null;
    return reminders.sort(
      (a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)
    )[0];
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reminderDate = new Date(date);
    reminderDate.setHours(0, 0, 0, 0);

    const diffTime = reminderDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Mañana';
    if (diffDays > 0) return `En ${diffDays} días`;
    return `Hace ${Math.abs(diffDays)} días`;
  };

  const mainPet = pets.length > 0 ? pets[0] : null;
  const nextReminder = getNextReminder();
  const nextVaccine = vaccines.length > 0 ? vaccines[0] : null;
  const activeConsultation = consultations
    .filter((consultation) =>
      ['PENDING_PAYMENT', 'PENDING_APPROVAL', 'IN_PROGRESS', 'PAID'].includes(consultation.status)
    )
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

  const getConsultationStatusLabel = (status) => {
    switch (status) {
      case 'PENDING_PAYMENT':
        return 'Pago pendiente';
      case 'PENDING_APPROVAL':
        return 'Esperando respuesta del veterinario';
      case 'IN_PROGRESS':
        return 'En curso';
      case 'PAID':
        return 'Lista para continuar';
      default:
        return 'Activa';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B7FA8" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {activeConsultation ? (
        <AnimatedCard
          style={styles.activeConsultationCard}
          onPress={() => router.push(`/consultar/consulta-chat?id=${activeConsultation.id}`)}
        >
          <View style={styles.activeConsultationHeader}>
            <View style={styles.activeConsultationCopy}>
              <Text style={styles.activeConsultationEyebrow}>Consulta activa</Text>
              <Text style={styles.activeConsultationTitle}>
                {activeConsultation.type === 'CHAT' && 'Continua tu chat con el veterinario'}
                {activeConsultation.type === 'VOICE' && 'Continua tu llamada con el veterinario'}
                {activeConsultation.type === 'VIDEO' && 'Continua tu videollamada'}
              </Text>
              <Text style={styles.activeConsultationSubtitle}>
                {getConsultationStatusLabel(activeConsultation.status)}
              </Text>
            </View>
            <Ionicons name="arrow-forward-circle" size={28} color={COLORS.primary} />
          </View>
        </AnimatedCard>
      ) : null}

      <View style={styles.heroSection}>
        <View style={styles.heroBadge}>
          <Ionicons name="medkit-outline" size={16} color={COLORS.primary} />
          <Text style={styles.heroBadgeText}>Consulta veterinaria</Text>
        </View>
        <Text style={styles.heroTitle}>Habla con un veterinario en pocos pasos</Text>
        <Text style={styles.heroSubtitle}>
          Solicita una consulta cuando necesites orientacion para tu mascota.
          Elige el tipo de ayuda y comienza rapidamente.
        </Text>
        <AnimatedButton
          style={styles.heroPrimaryButton}
          onPress={() => router.push('/consultar')}
        >
          <View style={styles.heroPrimaryButtonContent}>
            <View style={styles.heroPrimaryButtonIcon}>
              <Ionicons name="chatbubbles" size={24} color={COLORS.textWhite} />
            </View>
            <View style={styles.heroPrimaryButtonText}>
              <Text style={styles.heroPrimaryButtonTitle}>Solicitar consulta</Text>
              <Text style={styles.heroPrimaryButtonSubtitle}>
                Chat, voz o video
              </Text>
            </View>
          </View>
          <Ionicons name="arrow-forward" size={22} color={COLORS.textWhite} />
        </AnimatedButton>

        <AnimatedButton
          style={styles.heroSecondaryButton}
          onPress={() => router.push('/mascotas')}
        >
          <Ionicons name="paw-outline" size={18} color={COLORS.textSecondary} />
          <Text style={styles.heroSecondaryButtonText}>Ver mis mascotas</Text>
        </AnimatedButton>
      </View>

      <View style={styles.secondarySection}>
        <Text style={styles.secondarySectionTitle}>Informacion util</Text>

        {mainPet ? (
          <AnimatedCard
            style={styles.petCard}
            onPress={() => router.push('/mascotas')}
          >
            <View style={styles.petHeader}>
              {mainPet.photo ? (
                <Image source={{ uri: mainPet.photo }} style={styles.petPhoto} />
              ) : (
                <View style={styles.petPhotoPlaceholder}>
                  <Text style={styles.petPhotoIcon}>🐾</Text>
                </View>
              )}
              <View style={styles.petInfo}>
                <Text style={styles.petLabel}>Mascota principal</Text>
                <Text style={styles.petName}>{mainPet.name}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
            </View>
          </AnimatedCard>
        ) : (
          <AnimatedCard
            style={styles.addPetCard}
            onPress={() => router.push('/mascotas')}
          >
            <Ionicons name="add-circle-outline" size={32} color={COLORS.primary} />
            <Text style={styles.addPetText}>Agrega tu primera mascota</Text>
            <Text style={styles.addPetSubtext}>Opcional, pero te ayudara a consultar mas rapido</Text>
          </AnimatedCard>
        )}

        {(nextReminder || nextVaccine) && (
          <View style={styles.supportCards}>
            {nextReminder && (
              <AnimatedCard
                style={styles.supportCard}
                onPress={() => router.push('/salud')}
              >
                <View style={styles.supportCardIcon}>
                  <Ionicons name="notifications-outline" size={20} color={COLORS.textSecondary} />
                </View>
                <View style={styles.supportCardInfo}>
                  <Text style={styles.supportCardLabel}>Proximo recordatorio</Text>
                  <Text style={styles.supportCardText} numberOfLines={2}>
                    {nextReminder.title}
                  </Text>
                </View>
                <Text style={styles.supportCardDate}>
                  {formatDate(nextReminder.scheduledAt)}
                </Text>
              </AnimatedCard>
            )}

            {nextVaccine && (
              <AnimatedCard
                style={styles.supportCard}
                onPress={() => router.push('/salud')}
              >
                <View style={styles.supportCardIcon}>
                  <Ionicons name="medical-outline" size={20} color={COLORS.textSecondary} />
                </View>
                <View style={styles.supportCardInfo}>
                  <Text style={styles.supportCardLabel}>Proxima vacuna</Text>
                  <Text style={styles.supportCardText} numberOfLines={2}>
                    {nextVaccine.name}
                  </Text>
                </View>
                <Text style={styles.supportCardDate}>
                  {nextVaccine.nextDose ? formatDate(nextVaccine.nextDose) : ''}
                </Text>
              </AnimatedCard>
            )}
          </View>
        )}
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.quickActionsTitle}>Herramientas</Text>
        <View style={styles.quickActionsGrid}>
          <AnimatedCard
            style={styles.quickActionCard}
            onPress={() => router.push('/mascotas')}
          >
            <Ionicons name="paw-outline" size={24} color={COLORS.textSecondary} />
            <Text style={styles.quickActionText}>Mascotas</Text>
          </AnimatedCard>
          <AnimatedCard
            style={styles.quickActionCard}
            onPress={() => router.push('/salud')}
          >
            <Ionicons name="medical-outline" size={24} color={COLORS.textSecondary} />
            <Text style={styles.quickActionText}>Historial</Text>
          </AnimatedCard>
          <AnimatedCard
            style={styles.quickActionCard}
            onPress={() => router.push('/perfil')}
          >
            <Ionicons name="settings-outline" size={24} color={COLORS.textSecondary} />
            <Text style={styles.quickActionText}>Ajustes</Text>
          </AnimatedCard>
        </View>
      </View>

      <View style={styles.bannerSection}>
        <RunningPetsBanner />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl + SPACING.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroSection: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xxl + SPACING.xs,
    marginBottom: SPACING.xxl,
    ...SHADOWS.md,
  },
  activeConsultationCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    ...SHADOWS.sm,
  },
  activeConsultationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeConsultationCopy: {
    flex: 1,
    marginRight: SPACING.md,
  },
  activeConsultationEyebrow: {
    ...TYPOGRAPHY.small,
    color: COLORS.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.xs / 2,
  },
  activeConsultationTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs / 2,
  },
  activeConsultationSubtitle: {
    ...TYPOGRAPHY.small,
    color: COLORS.textSecondary,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
    marginBottom: SPACING.lg,
  },
  heroBadgeText: {
    ...TYPOGRAPHY.small,
    color: COLORS.primary,
    fontWeight: '600',
  },
  heroTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  heroSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  heroPrimaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl + SPACING.xs,
    marginBottom: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOWS.lg,
  },
  heroPrimaryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  heroPrimaryButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  heroPrimaryButtonText: {
    flex: 1,
  },
  heroPrimaryButtonTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textWhite,
    marginBottom: SPACING.xs / 2,
  },
  heroPrimaryButtonSubtitle: {
    ...TYPOGRAPHY.small,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  heroSecondaryButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.backgroundTertiary,
  },
  heroSecondaryButtonText: {
    ...TYPOGRAPHY.small,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  petCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  petHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
    backgroundColor: COLORS.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  petPhotoIcon: {
    fontSize: 28,
  },
  petInfo: {
    flex: 1,
  },
  petLabel: {
    ...TYPOGRAPHY.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs / 2,
  },
  petName: {
    ...TYPOGRAPHY.bodyBold,
  },
  addPetCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  addPetText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
  },
  addPetSubtext: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs / 2,
  },
  secondarySection: {
    marginBottom: SPACING.xl,
  },
  secondarySectionTitle: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
  },
  supportCards: {
    gap: SPACING.sm,
  },
  supportCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  supportCardIcon: {
    marginRight: SPACING.md,
  },
  supportCardInfo: {
    flex: 1,
  },
  supportCardLabel: {
    ...TYPOGRAPHY.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs / 2,
  },
  supportCardText: {
    ...TYPOGRAPHY.body,
  },
  supportCardDate: {
    ...TYPOGRAPHY.small,
    color: COLORS.textSecondary,
    marginLeft: SPACING.md,
  },
  quickActions: {
    marginTop: SPACING.md,
  },
  quickActionsTitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  quickActionCard: {
    width: '31%',
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickActionText: {
    ...TYPOGRAPHY.small,
    marginTop: SPACING.xs,
    textAlign: 'center',
    color: COLORS.textSecondary,
  },
  bannerSection: {
    marginTop: SPACING.xl,
    opacity: 0.9,
  },
});

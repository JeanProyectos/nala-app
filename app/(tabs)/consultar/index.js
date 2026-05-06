import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import AnimatedCard from '../../../components/AnimatedCard';
import AnimatedButton from '../../../components/AnimatedButton';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../../../styles/theme';

const CONSULTATION_FLOW_STEPS = [
  {
    id: 'choose-vet',
    title: '1. Elige veterinario',
    subtitle: 'Revisa perfiles, experiencia y disponibilidad antes de decidir.',
    icon: 'medkit-outline',
    color: COLORS.primary,
  },
  {
    id: 'choose-service',
    title: '2. Elige modalidad',
    subtitle: 'Dentro del perfil veras chat, voz y video con el precio de ese veterinario.',
    icon: 'grid-outline',
    color: COLORS.accentBlue,
  },
  {
    id: 'start-consultation',
    title: '3. Inicia tu consulta',
    subtitle: 'Confirma el servicio y entra al chat o llamada correspondiente.',
    icon: 'arrow-forward-circle-outline',
    color: COLORS.accentGreen,
  },
];

export default function ConsultarScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [pets, setPets] = useState([]);
  const [loadingPets, setLoadingPets] = useState(true);
  const [selectedPetId, setSelectedPetId] = useState(null);
  const [errorState, setErrorState] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadPets();
    }, [])
  );

  const loadPets = async () => {
    try {
      setLoadingPets(true);
      const data = await api.getPets();
      setPets(Array.isArray(data) ? data : []);
    } catch (error) {
      setPets([]);
    } finally {
      setLoadingPets(false);
    }
  };

  const handleRequestConsultation = async () => {
    try {
      const veterinarians = await api.searchVeterinarians();
      const availableVeterinarians = Array.isArray(veterinarians)
        ? veterinarians.filter((vet) => vet.availabilityStatus !== 'UNAVAILABLE')
        : [];

      if (availableVeterinarians.length === 0) {
        setErrorState(true);
        return;
      }

      const query = new URLSearchParams(
        selectedPetId ? { petId: String(selectedPetId) } : {}
      ).toString();

      router.push(query ? `veterinarios?${query}` : 'veterinarios');
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudieron cargar los veterinarios');
    }
  };

  const resetSelection = () => {
    setErrorState(false);
  };

  if (errorState) {
    return (
      <View style={styles.loadingState}>
        <View style={styles.searchingCard}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.accentOrange} />
          <Text style={styles.searchingTitle}>No hay veterinarios disponibles ahora</Text>
          <Text style={styles.searchingSubtitle}>
            Puedes reintentar en unos minutos o revisar nuevamente la lista disponible.
          </Text>
          <AnimatedButton style={styles.retryButton} onPress={handleRequestConsultation}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </AnimatedButton>
          <AnimatedButton style={styles.secondaryButton} onPress={resetSelection}>
            <Text style={styles.secondaryButtonText}>Volver al inicio</Text>
          </AnimatedButton>
          <AnimatedButton
            style={styles.linkButton}
            onPress={() => router.push('veterinarios')}
          >
            <Text style={styles.linkButtonText}>Ver veterinarios disponibles</Text>
          </AnimatedButton>
        </View>
      </View>
    );
  }

  if (user?.role === 'VET') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Ver consultas</Text>
          <Text style={styles.headerSubtitle}>
            Desde aquí puedes revisar solicitudes pendientes, consultas activas y tu historial.
          </Text>
        </View>

        <AnimatedCard style={styles.vetDashboardCard} onPress={() => router.push('pacientes?filter=active')}>
          <View style={styles.vetDashboardIcon}>
            <Ionicons name="time-outline" size={30} color={COLORS.primary} />
          </View>
          <View style={styles.vetDashboardInfo}>
            <Text style={styles.vetDashboardTitle}>Solicitudes y consultas activas</Text>
            <Text style={styles.vetDashboardSubtitle}>
              Acepta consultas pendientes y entra a las que ya están en curso.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
        </AnimatedCard>

        <AnimatedCard style={styles.vetDashboardCard} onPress={() => router.push('pacientes?filter=finished')}>
          <View style={styles.vetDashboardIcon}>
            <Ionicons name="document-text-outline" size={30} color={COLORS.accentGreen} />
          </View>
          <View style={styles.vetDashboardInfo}>
            <Text style={styles.vetDashboardTitle}>Historial de consultas</Text>
            <Text style={styles.vetDashboardSubtitle}>
              Consulta las finalizadas, rechazadas o canceladas.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
        </AnimatedCard>

        <AnimatedCard
          style={styles.vetDashboardCard}
          onPress={() => router.push('/(tabs)/consultar/liquidaciones')}
        >
          <View style={styles.vetDashboardIcon}>
            <Ionicons name="cash-outline" size={30} color={COLORS.accentOrange} />
          </View>
          <View style={styles.vetDashboardInfo}>
            <Text style={styles.vetDashboardTitle}>Liquidaciones y pagos</Text>
            <Text style={styles.vetDashboardSubtitle}>
              Consulta tus ingresos, la comision aplicada y los lotes pendientes de pago.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
        </AnimatedCard>

        <AnimatedButton style={styles.ctaButton} onPress={() => router.push('pacientes')}>
          <Text style={styles.ctaButtonText}>Ver todas mis consultas</Text>
        </AnimatedButton>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Solicitar consulta</Text>
        <Text style={styles.headerSubtitle}>
          Primero elige al veterinario ideal para tu mascota. Dentro de su perfil podras comparar chat,
          llamada y videollamada con sus precios.
        </Text>
      </View>

      <View style={styles.flowSection}>
        <Text style={styles.flowSectionTitle}>Como funciona</Text>
        {CONSULTATION_FLOW_STEPS.map((step) => (
          <AnimatedCard key={step.id} style={styles.flowCard}>
            <View style={[styles.flowIcon, { backgroundColor: `${step.color}18` }]}>
              <Ionicons name={step.icon} size={24} color={step.color} />
            </View>
            <View style={styles.flowInfo}>
              <Text style={styles.flowTitle}>{step.title}</Text>
              <Text style={styles.flowSubtitle}>{step.subtitle}</Text>
            </View>
          </AnimatedCard>
        ))}
      </View>

      <AnimatedButton style={styles.ctaButton} onPress={handleRequestConsultation}>
        <View style={styles.ctaButtonContent}>
          <View style={styles.ctaButtonIcon}>
            <Ionicons name="medkit" size={24} color={COLORS.textWhite} />
          </View>
          <View style={styles.ctaButtonCopy}>
            <Text style={styles.ctaButtonText}>Solicitar consulta</Text>
            <Text style={styles.ctaButtonSubtext}>Consulta por chat, llamada o video</Text>
          </View>
          <Ionicons name="arrow-forward" size={22} color={COLORS.textWhite} />
        </View>
      </AnimatedButton>

      <AnimatedCard style={styles.tipCard}>
        <View style={styles.tipHeader}>
          <Ionicons name="sparkles-outline" size={20} color={COLORS.primary} />
          <Text style={styles.tipTitle}>Te ayudamos a elegir mejor</Text>
        </View>
        <Text style={styles.tipText}>
          Puedes asociar una mascota ahora para que el veterinario tenga contexto desde el inicio. Si no la
          eliges, podras continuar igual.
        </Text>
      </AnimatedCard>

      <View style={styles.petSection}>
        <Text style={styles.petSectionTitle}>Mascota para esta consulta</Text>
        <Text style={styles.petSectionSubtitle}>
          Opcional. Si la seleccionas, la consulta se creara con esa mascota vinculada.
        </Text>

        {loadingPets ? (
          <View style={styles.petLoading}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        ) : pets.length === 0 ? (
          <AnimatedCard style={styles.noPetCard}>
            <Text style={styles.noPetText}>
              No tienes mascotas registradas. Puedes solicitar la consulta igualmente.
            </Text>
          </AnimatedCard>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.petList}
          >
            <AnimatedButton
              style={[
                styles.petChip,
                selectedPetId === null && styles.petChipSelected,
              ]}
              onPress={() => setSelectedPetId(null)}
            >
              <Text
                style={[
                  styles.petChipText,
                  selectedPetId === null && styles.petChipTextSelected,
                ]}
              >
                Sin mascota
              </Text>
            </AnimatedButton>
            {pets.map((pet) => (
              <AnimatedButton
                key={pet.id}
                style={[
                  styles.petChip,
                  selectedPetId === pet.id && styles.petChipSelected,
                ]}
                onPress={() => setSelectedPetId(pet.id)}
              >
                <Text
                  style={[
                    styles.petChipText,
                    selectedPetId === pet.id && styles.petChipTextSelected,
                  ]}
                >
                  {pet.name}
                </Text>
              </AnimatedButton>
            ))}
          </ScrollView>
        )}
      </View>

      <AnimatedButton style={styles.historyLink} onPress={() => router.push('pacientes')}>
        <Text style={styles.historyLinkText}>Ver mis consultas</Text>
      </AnimatedButton>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },
  vetDashboardCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  vetDashboardIcon: {
    width: 52,
    height: 52,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  vetDashboardInfo: {
    flex: 1,
  },
  vetDashboardTitle: {
    ...TYPOGRAPHY.bodyBold,
    marginBottom: SPACING.xs,
  },
  vetDashboardSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: 100, // Espacio para el tabBar
  },
  header: {
    marginBottom: SPACING.xl,
    paddingTop: SPACING.lg,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    marginBottom: SPACING.sm,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  flowSection: {
    marginBottom: SPACING.xl,
  },
  flowSectionTitle: {
    ...TYPOGRAPHY.bodyBold,
    marginBottom: SPACING.md,
  },
  flowCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  flowIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  flowInfo: {
    flex: 1,
  },
  flowTitle: {
    ...TYPOGRAPHY.bodyBold,
    marginBottom: 2,
  },
  flowSubtitle: {
    ...TYPOGRAPHY.caption,
    lineHeight: 18,
  },
  tipCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.xl,
    ...SHADOWS.sm,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  tipTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textPrimary,
  },
  tipText: {
    ...TYPOGRAPHY.caption,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  petSection: {
    marginBottom: SPACING.xl,
  },
  petSectionTitle: {
    ...TYPOGRAPHY.bodyBold,
    marginBottom: SPACING.xs,
  },
  petSectionSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  petLoading: {
    paddingVertical: SPACING.md,
  },
  noPetCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  noPetText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  petList: {
    paddingRight: SPACING.md,
  },
  petChip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
  },
  petChipSelected: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  petChipText: {
    ...TYPOGRAPHY.small,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  petChipTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  ctaButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.xl,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'center',
    marginBottom: SPACING.xl,
    ...SHADOWS.lg,
  },
  ctaButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ctaButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  ctaButtonCopy: {
    flex: 1,
    marginRight: SPACING.md,
  },
  ctaButtonText: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textWhite,
  },
  ctaButtonSubtext: {
    ...TYPOGRAPHY.small,
    color: 'rgba(255, 255, 255, 0.92)',
  },
  historyLink: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    marginTop: SPACING.sm,
  },
  historyLinkText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textSecondary,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    padding: SPACING.xl,
  },
  searchingCard: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xxl,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  searchingTitle: {
    ...TYPOGRAPHY.h4,
    textAlign: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  searchingSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxl,
    marginTop: SPACING.xl,
    minWidth: 180,
    alignItems: 'center',
  },
  retryButtonText: {
    ...TYPOGRAPHY.button,
  },
  secondaryButton: {
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.sm,
    minWidth: 180,
    alignItems: 'center',
  },
  secondaryButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textSecondary,
  },
  linkButton: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  linkButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.primary,
  },
});

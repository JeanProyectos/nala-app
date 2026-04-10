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

const CONSULTATION_TYPES = [
  {
    id: 'CHAT',
    title: 'Chat',
    subtitle: 'Ideal para dudas y orientacion escrita.',
    helperText: 'Empieza rapido y conversa por mensajes.',
    icon: 'chatbubbles',
    color: COLORS.primary,
    primary: true,
  },
  {
    id: 'VOICE',
    title: 'Voz',
    subtitle: 'Habla por llamada con un veterinario.',
    helperText: 'Util para explicar sintomas rapidamente.',
    icon: 'call',
    color: COLORS.accentGreen,
  },
  {
    id: 'VIDEO',
    title: 'Video',
    subtitle: 'Muestra a tu mascota en tiempo real.',
    helperText: 'Recomendado cuando quieres enseñar algo visual.',
    icon: 'videocam',
    color: COLORS.accentOrange,
  },
];

export default function ConsultarScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [pets, setPets] = useState([]);
  const [loadingPets, setLoadingPets] = useState(true);
  const [selectedType, setSelectedType] = useState(null);
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

  const handleSelectType = (type) => {
    setSelectedType(type);
    setErrorState(false);
  };

  const handleRequestConsultation = async () => {
    if (!selectedType) {
      Alert.alert('Selecciona un tipo', 'Elige chat, voz o video para continuar.');
      return;
    }

    try {
      const veterinarians = await api.searchVeterinarians();
      const availableVeterinarians = Array.isArray(veterinarians)
        ? veterinarians.filter((vet) => vet.availabilityStatus !== 'UNAVAILABLE')
        : [];

      if (availableVeterinarians.length === 0) {
        setErrorState(true);
        return;
      }

      const query = new URLSearchParams({
        type: selectedType,
        ...(selectedPetId ? { petId: String(selectedPetId) } : {}),
      }).toString();

      router.push(`veterinarios?${query}`);
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudieron cargar los veterinarios');
    }
  };

  const resetSelection = () => {
    setErrorState(false);
    setSelectedType(null);
  };

  if (errorState) {
    return (
      <View style={styles.loadingState}>
        <View style={styles.searchingCard}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.accentOrange} />
          <Text style={styles.searchingTitle}>No hay veterinarios disponibles ahora</Text>
          <Text style={styles.searchingSubtitle}>
            Puedes reintentar o cambiar el tipo de consulta.
          </Text>
          <AnimatedButton style={styles.retryButton} onPress={handleRequestConsultation}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </AnimatedButton>
          <AnimatedButton style={styles.secondaryButton} onPress={resetSelection}>
            <Text style={styles.secondaryButtonText}>Elegir otro tipo</Text>
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
          Elige el tipo de consulta y, si quieres, selecciona una mascota antes de escoger veterinario.
        </Text>
      </View>

      {CONSULTATION_TYPES.map((option) => (
        <AnimatedCard
          key={option.id}
          style={[
            styles.optionCard,
            option.primary && styles.primaryCard,
            selectedType === option.id && styles.optionCardSelected,
          ]}
          onPress={() => handleSelectType(option.id)}
        >
          <View style={[styles.optionIcon, { backgroundColor: `${option.color}15` }]}>
            <Ionicons name={option.icon} size={32} color={option.color} />
          </View>
          <View style={styles.optionInfo}>
            <Text style={[styles.optionTitle, option.primary && styles.primaryTitle]}>
              {option.title}
            </Text>
            <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
            <View style={styles.helperContainer}>
              <Ionicons name="information-circle-outline" size={14} color={COLORS.textTertiary} />
              <Text style={styles.helperText}>{option.helperText}</Text>
            </View>
          </View>
          <Ionicons
            name={selectedType === option.id ? 'checkmark-circle' : 'chevron-forward'}
            size={20} 
            color={selectedType === option.id ? COLORS.accentGreen : option.primary ? COLORS.textWhite : COLORS.textTertiary}
          />
        </AnimatedCard>
      ))}

      <View style={styles.petSection}>
        <Text style={styles.petSectionTitle}>Mascota (opcional)</Text>
        <Text style={styles.petSectionSubtitle}>
          Puedes continuar sin seleccionar una mascota.
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

      <AnimatedButton style={styles.ctaButton} onPress={handleRequestConsultation}>
        <Text style={styles.ctaButtonText}>Ver veterinarios disponibles</Text>
      </AnimatedButton>

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
  optionCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    ...SHADOWS.md,
  },
  primaryCard: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.lg,
  },
  optionCardSelected: {
    borderWidth: 2,
    borderColor: COLORS.accentGreen,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    ...TYPOGRAPHY.bodyBold,
    marginBottom: SPACING.xs,
  },
  primaryTitle: {
    color: COLORS.textWhite,
  },
  optionSubtitle: {
    ...TYPOGRAPHY.caption,
    lineHeight: 18,
    marginBottom: SPACING.xs,
  },
  helperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    gap: SPACING.xs / 2,
  },
  helperText: {
    ...TYPOGRAPHY.small,
    color: COLORS.textTertiary,
    flex: 1,
    lineHeight: 16,
  },
  petSection: {
    marginTop: SPACING.md,
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
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  ctaButtonText: {
    ...TYPOGRAPHY.button,
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

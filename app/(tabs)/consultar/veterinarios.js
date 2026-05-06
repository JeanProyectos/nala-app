import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import * as api from '../../../services/api';
import { formatPrice } from '../../../utils/formatPrice';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../../../styles/theme';

const SPECIALTIES = [
  { value: 'GENERAL', label: 'General' },
  { value: 'DERMATOLOGY', label: 'Dermatología' },
  { value: 'NUTRITION', label: 'Nutrición' },
  { value: 'SURGERY', label: 'Cirugía' },
  { value: 'CARDIOLOGY', label: 'Cardiología' },
  { value: 'ONCOLOGY', label: 'Oncología' },
  { value: 'ORTHOPEDICS', label: 'Ortopedia' },
  { value: 'BEHAVIOR', label: 'Comportamiento' },
  { value: 'EMERGENCY', label: 'Emergencias' },
];

const CONSULTATION_OPTIONS = [
  {
    id: 'CHAT',
    title: 'Chat',
    subtitle: 'Resuelve dudas, comparte fotos y recibe indicaciones por escrito.',
    shortLabel: 'Chat',
    icon: 'chatbubbles-outline',
    priceKey: 'priceChat',
    color: COLORS.primary,
    duration: '15 min aprox.',
  },
  {
    id: 'VOICE',
    title: 'Llamada',
    subtitle: 'Ideal para explicar sintomas rapidamente y recibir guia inmediata.',
    shortLabel: 'Voz',
    icon: 'call-outline',
    priceKey: 'priceVoice',
    color: COLORS.accentBlue,
    duration: '20 min aprox.',
  },
  {
    id: 'VIDEO',
    title: 'Videollamada',
    subtitle: 'Muestra a tu mascota en tiempo real para una evaluacion mas visual.',
    shortLabel: 'Video',
    icon: 'videocam-outline',
    priceKey: 'priceVideo',
    color: COLORS.accentOrange,
    duration: '25 min aprox.',
  },
];

export default function VeterinariosScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const normalizedType = typeof params.type === 'string' ? params.type.toUpperCase() : null;
  const selectedType = ['CHAT', 'VOICE', 'VIDEO'].includes(normalizedType) ? normalizedType : null;
  const selectedPetId = typeof params.petId === 'string' ? parseInt(params.petId, 10) : undefined;
  const [veterinarians, setVeterinarians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState(null);
  const [selectedVet, setSelectedVet] = useState(null);
  const [selectedConsultType, setSelectedConsultType] = useState(selectedType);
  const [showFilters, setShowFilters] = useState(false);
  const [showVetModal, setShowVetModal] = useState(false);
  const [creatingConsultation, setCreatingConsultation] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadVeterinarians();
    }, [])
  );

  const loadVeterinarians = async () => {
    try {
      setLoading(true);
      const filters = {};
      if (searchText) filters.search = searchText;
      if (selectedSpecialty) filters.specialty = selectedSpecialty;
      
      const data = await api.searchVeterinarians(filters);
      setVeterinarians(data);
    } catch (error) {
      console.error('Error cargando veterinarios:', error);
      Alert.alert('Error', 'No se pudieron cargar los veterinarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchText !== undefined) {
        loadVeterinarians();
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchText, selectedSpecialty]);

  const getConsultTypeLabel = (type) => {
    switch (type) {
      case 'VOICE':
        return 'Llamada de voz';
      case 'VIDEO':
        return 'Videollamada';
      default:
        return 'Chat';
    }
  };

  const getServicePrice = (vet, type) => {
    const option = CONSULTATION_OPTIONS.find((item) => item.id === type);
    const rawSpecificPrice = option ? Number(vet?.[option.priceKey]) : 0;
    if (Number.isFinite(rawSpecificPrice) && rawSpecificPrice > 0) {
      return rawSpecificPrice;
    }

    const fallbackPrice = Number(vet?.pricePerConsultation);
    return Number.isFinite(fallbackPrice) && fallbackPrice > 0 ? fallbackPrice : 0;
  };

  const getConsultationOptions = (vet) =>
    CONSULTATION_OPTIONS.map((option) => {
      const price = getServicePrice(vet, option.id);
      return {
        ...option,
        price,
        enabled: price > 0,
      };
    });

  const pickDefaultConsultationType = (vet, preferredType = selectedType) => {
    const options = getConsultationOptions(vet);
    const preferred = options.find((option) => option.id === preferredType && option.enabled);
    if (preferred) {
      return preferred.id;
    }

    const firstEnabled = options.find((option) => option.enabled);
    return firstEnabled?.id || options[0]?.id || 'CHAT';
  };

  const getStartingPrice = (vet) => {
    const prices = getConsultationOptions(vet)
      .filter((option) => option.enabled)
      .map((option) => option.price);

    if (prices.length === 0) {
      return 0;
    }

    return Math.min(...prices);
  };

  const getAvailabilityConfig = (status) => {
    if (status === 'AVAILABLE') {
      return {
        label: 'Disponible ahora',
        bg: '#E8F5E9',
        color: COLORS.accentGreen,
      };
    }

    if (status === 'IN_CONSULTATION') {
      return {
        label: 'En consulta',
        bg: '#FFF4E5',
        color: COLORS.accentOrange,
      };
    }

    return {
      label: 'No disponible',
      bg: '#FDECEC',
      color: COLORS.accentRed,
    };
  };

  const handleViewProfile = (vet) => {
    setSelectedVet(vet);
    setSelectedConsultType(pickDefaultConsultationType(vet));
    setShowVetModal(true);
  };

  const handleStartConsultation = async (typeOverride = null, vetOverride = null) => {
    const targetVet = vetOverride || selectedVet;
    const type = typeOverride || selectedConsultType;
    if (!targetVet) {
      Alert.alert('Error', 'No se encontró el veterinario seleccionado');
      return;
    }
    if (!type) {
      Alert.alert('Selecciona un servicio', 'Elige chat, llamada o videollamada para continuar.');
      return;
    }

    try {
      setCreatingConsultation(true);
      const consultation = await api.createConsultation({
        type,
        veterinarianId: targetVet.id,
        petId: Number.isNaN(selectedPetId) ? undefined : selectedPetId,
      });

      setShowVetModal(false);
      router.push(`consulta-chat?id=${consultation.id}`);
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo crear la consulta');
    } finally {
      setCreatingConsultation(false);
    }
  };

  const handleSelectVeterinarian = (vet) => {
    handleViewProfile(vet);
  };

  const renderStars = (rating) => {
    if (!rating || rating === 0) {
      return '☆☆☆☆☆';
    }
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push('⭐');
      } else if (i === fullStars && hasHalfStar) {
        stars.push('✨');
      } else {
        stars.push('☆');
      }
    }
    return stars.join('');
  };

  const selectedVetOptions = selectedVet ? getConsultationOptions(selectedVet) : [];
  const currentSelectedOption =
    selectedVetOptions.find((option) => option.id === selectedConsultType) || selectedVetOptions[0];
  const selectedAvailability = getAvailabilityConfig(selectedVet?.availabilityStatus);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Veterinarios disponibles</Text>
          <Text style={styles.headerSubtitle}>
            Elige un perfil para comparar modalidades, precios y disponibilidad en un solo lugar.
          </Text>
          {selectedPetId ? (
            <View style={styles.petLinkedBadge}>
              <Ionicons name="paw-outline" size={16} color={COLORS.primary} />
              <Text style={styles.petLinkedText}>Tu consulta se creará con la mascota seleccionada</Text>
            </View>
          ) : null}
          {selectedType ? (
            <View style={styles.selectedTypeBanner}>
              <Text style={styles.selectedTypeTitle}>
                Llegaste con {getConsultTypeLabel(selectedType).toLowerCase()} preseleccionado
              </Text>
              <Text style={styles.selectedTypeSubtitle}>
                Puedes mantenerlo o cambiarlo dentro del perfil del veterinario.
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrap}>
            <Ionicons name="search-outline" size={18} color={COLORS.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Busca por nombre, ciudad o especialidad"
              value={searchText}
              onChangeText={setSearchText}
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>
          <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(!showFilters)}>
            <Ionicons name="options-outline" size={20} color={COLORS.textWhite} />
          </TouchableOpacity>
        </View>

        {showFilters && (
          <ScrollView
            horizontal
            style={styles.filtersContainer}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContent}
          >
            <TouchableOpacity
              style={[
                styles.filterChip,
                !selectedSpecialty && styles.filterChipActive,
              ]}
              onPress={() => {
                setSelectedSpecialty(null);
                setShowFilters(false);
              }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  !selectedSpecialty && styles.filterChipTextActive,
                ]}
              >
                Todos
              </Text>
            </TouchableOpacity>

            {SPECIALTIES.map((spec) => (
              <TouchableOpacity
                key={spec.value}
                style={[
                  styles.filterChip,
                  selectedSpecialty === spec.value && styles.filterChipActive,
                ]}
                onPress={() => {
                  setSelectedSpecialty(spec.value);
                  setShowFilters(false);
                }}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedSpecialty === spec.value && styles.filterChipTextActive,
                  ]}
                >
                  {spec.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : veterinarians.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="medkit-outline" size={48} color={COLORS.textTertiary} />
            <Text style={styles.emptyTitle}>No encontramos veterinarios con esos filtros</Text>
            <Text style={styles.emptySubtitle}>
              Prueba con otra especialidad o borra tu búsqueda para ver más opciones.
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
            {veterinarians.map((vet) => {
              const availability = getAvailabilityConfig(vet.availabilityStatus);
              const options = getConsultationOptions(vet);
              const startingPrice = getStartingPrice(vet);

              return (
                <TouchableOpacity
                  key={vet.id}
                  style={styles.vetCard}
                  activeOpacity={0.92}
                  onPress={() => handleSelectVeterinarian(vet)}
                >
                  <View style={styles.vetTopRow}>
                    {vet.profilePhoto ? (
                      <Image source={{ uri: vet.profilePhoto }} style={styles.vetPhoto} />
                    ) : (
                      <View style={styles.vetPhotoPlaceholder}>
                        <Ionicons name="person-outline" size={32} color={COLORS.primary} />
                      </View>
                    )}
                    <View style={styles.vetInfo}>
                      <View style={styles.vetNameRow}>
                        <Text style={styles.vetName}>{vet.fullName}</Text>
                        <View style={[styles.availabilityBadge, { backgroundColor: availability.bg }]}>
                          <Text style={[styles.availabilityText, { color: availability.color }]}>
                            {availability.label}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.vetSpecialty}>
                        {SPECIALTIES.find((s) => s.value === vet.specialty)?.label || vet.specialty}
                      </Text>
                      <Text style={styles.vetLocation}>
                        {vet.city}, {vet.country}
                      </Text>
                      <View style={styles.vetMetaRow}>
                        <Text style={styles.ratingText}>
                          {renderStars(vet.averageRating || 0)} {(vet.averageRating || 0).toFixed(1)}
                        </Text>
                        <Text style={styles.consultationsText}>
                          {vet.totalConsultations || 0} consultas
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.vetDescription} numberOfLines={2}>
                    {vet.professionalDescription ||
                      'Atención veterinaria en línea con modalidades flexibles según tu necesidad.'}
                  </Text>

                  <View style={styles.servicePreviewRow}>
                    {options.map((option) => (
                      <View key={option.id} style={styles.servicePreviewChip}>
                        <Ionicons name={option.icon} size={14} color={option.color} />
                        <Text style={styles.servicePreviewLabel}>{option.shortLabel}</Text>
                        <Text style={styles.servicePreviewPrice}>
                          {option.enabled ? `$${formatPrice(option.price)}` : 'No config.'}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.cardFooter}>
                    <View>
                      <Text style={styles.startingPriceLabel}>Desde</Text>
                      <Text style={styles.startingPriceValue}>
                        {startingPrice > 0 ? `$${formatPrice(startingPrice)}` : 'Precio pendiente'}
                      </Text>
                    </View>
                    <View style={styles.profileButton}>
                      <Text style={styles.profileButtonText}>Ver perfil y servicios</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        <Modal
          visible={showVetModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowVetModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {selectedVet && (
                <>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.modalHeader}>
                      {selectedVet.profilePhoto ? (
                        <Image source={{ uri: selectedVet.profilePhoto }} style={styles.modalPhoto} />
                      ) : (
                        <View style={styles.modalPhotoPlaceholder}>
                          <Ionicons name="person-outline" size={48} color={COLORS.primary} />
                        </View>
                      )}
                      <Text style={styles.modalName}>{selectedVet.fullName}</Text>
                      <Text style={styles.modalSpecialty}>
                        {SPECIALTIES.find((s) => s.value === selectedVet.specialty)?.label ||
                          selectedVet.specialty}
                      </Text>
                      <Text style={styles.modalLocation}>
                        {selectedVet.city}, {selectedVet.country}
                      </Text>
                      <View
                        style={[
                          styles.modalAvailabilityBadge,
                          { backgroundColor: selectedAvailability.bg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.modalAvailabilityText,
                            { color: selectedAvailability.color },
                          ]}
                        >
                          {selectedAvailability.label}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.modalStatsRow}>
                      <View style={styles.modalStatCard}>
                        <Text style={styles.modalStatValue}>
                          {(selectedVet.averageRating || 0).toFixed(1)}
                        </Text>
                        <Text style={styles.modalStatLabel}>Calificación</Text>
                      </View>
                      <View style={styles.modalStatCard}>
                        <Text style={styles.modalStatValue}>{selectedVet.totalConsultations || 0}</Text>
                        <Text style={styles.modalStatLabel}>Consultas</Text>
                      </View>
                      <View style={styles.modalStatCard}>
                        <Text style={styles.modalStatValue}>{selectedVet.yearsExperience || 0}</Text>
                        <Text style={styles.modalStatLabel}>Años exp.</Text>
                      </View>
                    </View>

                    <Text style={styles.modalDescription}>
                      {selectedVet.professionalDescription ||
                        'Atención veterinaria personalizada para orientarte según el caso de tu mascota.'}
                    </Text>

                    {selectedVet.languages && selectedVet.languages.length > 0 ? (
                      <Text style={styles.modalLanguages}>
                        Idiomas: {selectedVet.languages.join(', ')}
                      </Text>
                    ) : null}

                    <View style={styles.serviceSection}>
                      <Text style={styles.serviceSectionTitle}>Elige tu modalidad</Text>
                      <Text style={styles.serviceSectionSubtitle}>
                        Cada servicio muestra el precio definido por este veterinario.
                      </Text>

                      {selectedVetOptions.map((option) => {
                        const isSelected = selectedConsultType === option.id;
                        const isUnavailable =
                          selectedVet.availabilityStatus === 'UNAVAILABLE' || !option.enabled;

                        return (
                          <TouchableOpacity
                            key={option.id}
                            style={[
                              styles.serviceCard,
                              isSelected && styles.serviceCardSelected,
                              isUnavailable && styles.serviceCardDisabled,
                            ]}
                            activeOpacity={0.92}
                            onPress={() => {
                              if (!isUnavailable) {
                                setSelectedConsultType(option.id);
                              }
                            }}
                            disabled={isUnavailable}
                          >
                            <View style={[styles.serviceIcon, { backgroundColor: `${option.color}15` }]}>
                              <Ionicons name={option.icon} size={22} color={option.color} />
                            </View>
                            <View style={styles.serviceInfo}>
                              <View style={styles.serviceTitleRow}>
                                <Text style={styles.serviceTitle}>{option.title}</Text>
                                <Text style={styles.servicePrice}>
                                  {option.enabled ? `$${formatPrice(option.price)}` : 'No configurado'}
                                </Text>
                              </View>
                              <Text style={styles.serviceSubtitle}>{option.subtitle}</Text>
                              <View style={styles.serviceMetaRow}>
                                <View style={styles.durationBadge}>
                                  <Ionicons name="time-outline" size={12} color={COLORS.textSecondary} />
                                  <Text style={styles.durationText}>{option.duration}</Text>
                                </View>
                                {isSelected ? (
                                  <View style={styles.selectedBadge}>
                                    <Ionicons
                                      name="checkmark-circle"
                                      size={14}
                                      color={COLORS.accentGreen}
                                    />
                                    <Text style={styles.selectedBadgeText}>Seleccionado</Text>
                                  </View>
                                ) : null}
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {selectedPetId ? (
                      <View style={styles.petHintCard}>
                        <Ionicons name="paw-outline" size={18} color={COLORS.primary} />
                        <Text style={styles.petHintText}>
                          La consulta quedará asociada a la mascota que elegiste previamente.
                        </Text>
                      </View>
                    ) : null}
                  </ScrollView>

                  {selectedVet.availabilityStatus !== 'UNAVAILABLE' ? (
                    <View style={styles.modalActions}>
                      <TouchableOpacity
                        style={[
                          styles.primaryCta,
                          (!currentSelectedOption?.enabled || creatingConsultation) && styles.primaryCtaDisabled,
                        ]}
                        onPress={() => handleStartConsultation(currentSelectedOption?.id)}
                        disabled={!currentSelectedOption?.enabled || creatingConsultation}
                      >
                        {creatingConsultation ? (
                          <ActivityIndicator color={COLORS.textWhite} />
                        ) : (
                          <Text style={styles.primaryCtaText}>
                            {currentSelectedOption
                              ? `Continuar con ${currentSelectedOption.title} por $${formatPrice(
                                  currentSelectedOption.price
                                )}`
                              : 'Continuar'}
                          </Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.secondaryCta} onPress={() => setShowVetModal(false)}>
                        <Text style={styles.secondaryCtaText}>Cerrar</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.unavailableMessage}>
                      <Ionicons name="time-outline" size={18} color={COLORS.accentRed} />
                      <Text style={styles.unavailableText}>
                        Este veterinario no está disponible ahora mismo. Puedes revisar su perfil y volver más
                        tarde.
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        </Modal>
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
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background,
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.caption,
    lineHeight: 20,
  },
  petLinkedBadge: {
    marginTop: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.primaryLight,
  },
  selectedTypeBanner: {
    marginTop: SPACING.md,
    backgroundColor: '#F7F4FF',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  selectedTypeTitle: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primary,
  },
  selectedTypeSubtitle: {
    ...TYPOGRAPHY.small,
    marginTop: 2,
  },
  petLinkedText: {
    ...TYPOGRAPHY.small,
    color: COLORS.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  searchInputWrap: {
    flex: 1,
    height: 48,
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: BORDER_RADIUS.round,
    paddingHorizontal: SPACING.md,
    marginRight: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    ...TYPOGRAPHY.body,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  filtersContainer: {
    backgroundColor: COLORS.background,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  filtersContent: {
    paddingHorizontal: SPACING.lg,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.backgroundTertiary,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    ...TYPOGRAPHY.caption,
  },
  filterChipTextActive: {
    color: COLORS.textWhite,
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
    padding: SPACING.xxxl,
  },
  emptyTitle: {
    ...TYPOGRAPHY.bodyBold,
    textAlign: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
    color: COLORS.textSecondary,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl + 90,
  },
  vetCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  vetTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  vetPhoto: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginRight: SPACING.md,
  },
  vetPhotoPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  vetInfo: {
    flex: 1,
  },
  vetNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    alignItems: 'flex-start',
  },
  vetName: {
    ...TYPOGRAPHY.bodyBold,
    flex: 1,
  },
  vetSpecialty: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primary,
    marginTop: 2,
  },
  vetLocation: {
    ...TYPOGRAPHY.small,
    marginTop: 2,
  },
  vetMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  ratingText: {
    ...TYPOGRAPHY.small,
    color: COLORS.accentOrange,
    marginRight: SPACING.sm,
  },
  consultationsText: {
    ...TYPOGRAPHY.small,
  },
  availabilityBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: 12,
  },
  availabilityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  vetDescription: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginTop: SPACING.md,
  },
  servicePreviewRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  servicePreviewChip: {
    flex: 1,
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
    gap: 2,
  },
  servicePreviewLabel: {
    ...TYPOGRAPHY.small,
    color: COLORS.textSecondary,
  },
  servicePreviewPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  cardFooter: {
    marginTop: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  startingPriceLabel: {
    ...TYPOGRAPHY.small,
  },
  startingPriceValue: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.accentGreen,
  },
  profileButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.round,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  profileButtonText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textWhite,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    alignItems: 'center',
  },
  modalPhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  modalPhotoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  modalName: {
    ...TYPOGRAPHY.h3,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  modalSpecialty: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 2,
  },
  modalLocation: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  modalAvailabilityBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
  },
  modalAvailabilityText: {
    ...TYPOGRAPHY.captionBold,
  },
  modalStatsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  modalStatCard: {
    flex: 1,
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalStatValue: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textPrimary,
  },
  modalStatLabel: {
    ...TYPOGRAPHY.small,
    marginTop: 2,
  },
  modalDescription: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  modalLanguages: {
    ...TYPOGRAPHY.small,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  serviceSection: {
    marginTop: SPACING.xl,
  },
  serviceSectionTitle: {
    ...TYPOGRAPHY.bodyBold,
    marginBottom: SPACING.xs,
  },
  serviceSectionSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  serviceCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  serviceCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F7F4FF',
    ...SHADOWS.sm,
  },
  serviceCardDisabled: {
    opacity: 0.55,
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    alignItems: 'center',
    marginBottom: 2,
  },
  serviceTitle: {
    ...TYPOGRAPHY.bodyBold,
    flex: 1,
  },
  servicePrice: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.accentGreen,
  },
  serviceSubtitle: {
    ...TYPOGRAPHY.caption,
    lineHeight: 19,
    color: COLORS.textSecondary,
  },
  serviceMetaRow: {
    marginTop: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    alignItems: 'center',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.background,
  },
  durationText: {
    ...TYPOGRAPHY.small,
    color: COLORS.textSecondary,
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectedBadgeText: {
    ...TYPOGRAPHY.small,
    color: COLORS.accentGreen,
    fontWeight: '700',
  },
  petHintCard: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'flex-start',
  },
  petHintText: {
    ...TYPOGRAPHY.small,
    color: COLORS.primary,
    flex: 1,
    lineHeight: 17,
  },
  modalActions: {
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  primaryCta: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  primaryCtaDisabled: {
    opacity: 0.6,
  },
  primaryCtaText: {
    ...TYPOGRAPHY.button,
    textAlign: 'center',
    paddingHorizontal: SPACING.md,
  },
  secondaryCta: {
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryCtaText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textSecondary,
  },
  unavailableMessage: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: '#FDECEC',
    borderRadius: BORDER_RADIUS.md,
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
  },
  unavailableText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.accentRed,
    flex: 1,
  },
});

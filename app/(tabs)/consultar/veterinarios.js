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
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import * as api from '../../../services/api';

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

export default function VeterinariosScreen() {
  const router = useRouter();
  const [veterinarians, setVeterinarians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState(null);
  const [selectedVet, setSelectedVet] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showVetModal, setShowVetModal] = useState(false);

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

  const handleViewProfile = (vet) => {
    setSelectedVet(vet);
    setShowVetModal(true);
  };

  const handleStartConsultation = async (type) => {
    try {
      setShowVetModal(false);
      const consultation = await api.createConsultation({
        type,
        veterinarianId: selectedVet.id,
      });
      
      // Redirigir directamente al chat (pago después)
      router.push(`consulta-chat?id=${consultation.id}`);
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo crear la consulta');
    }
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
      {/* Barra de búsqueda */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar veterinarios..."
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#999"
        />
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={styles.filterButtonText}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* Filtros */}
      {showFilters && (
        <ScrollView
          horizontal
          style={styles.filtersContainer}
          showsHorizontalScrollIndicator={false}
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

      {/* Lista de veterinarios */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B7FA8" />
        </View>
      ) : veterinarians.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>👨‍⚕️</Text>
          <Text style={styles.emptyText}>No se encontraron veterinarios</Text>
        </View>
      ) : (
        <ScrollView style={styles.listContainer}>
          {veterinarians.map((vet) => (
            <TouchableOpacity
              key={vet.id}
              style={styles.vetCard}
              onPress={() => handleViewProfile(vet)}
            >
              {vet.profilePhoto ? (
                <Image
                  source={{ uri: vet.profilePhoto }}
                  style={styles.vetPhoto}
                />
              ) : (
                <View style={styles.vetPhotoPlaceholder}>
                  <Text style={styles.vetPhotoIcon}>👨‍⚕️</Text>
                </View>
              )}
              <View style={styles.vetInfo}>
                <Text style={styles.vetName}>{vet.fullName}</Text>
                <Text style={styles.vetSpecialty}>
                  {SPECIALTIES.find((s) => s.value === vet.specialty)?.label ||
                    vet.specialty}
                </Text>
                <Text style={styles.vetLocation}>
                  📍 {vet.city}, {vet.country}
                </Text>
                <View style={styles.vetRating}>
                  <Text style={styles.ratingText}>
                    {renderStars(vet.averageRating || 0)} {(vet.averageRating || 0).toFixed(1)}
                  </Text>
                  <Text style={styles.consultationsText}>
                    ({vet.totalConsultations || 0} consultas)
                  </Text>
                </View>
                <Text style={styles.vetPrice}>
                  ${((vet.priceChat || 0) + (vet.priceVoice || 0) + (vet.priceVideo || 0)) / 3 > 0 
                    ? (((vet.priceChat || 0) + (vet.priceVoice || 0) + (vet.priceVideo || 0)) / 3).toFixed(2)
                    : (vet.pricePerConsultation || 0).toFixed(2)} por consulta
                </Text>
              </View>
              <TouchableOpacity
                style={styles.consultButton}
                onPress={() => handleViewProfile(vet)}
              >
                <Text style={styles.consultButtonText}>Consultar</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Modal de perfil */}
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
                <ScrollView>
                  {selectedVet.profilePhoto ? (
                    <Image
                      source={{ uri: selectedVet.profilePhoto }}
                      style={styles.modalPhoto}
                    />
                  ) : (
                    <View style={styles.modalPhotoPlaceholder}>
                      <Text style={styles.modalPhotoIcon}>👨‍⚕️</Text>
                    </View>
                  )}
                  <Text style={styles.modalName}>{selectedVet.fullName}</Text>
                  <Text style={styles.modalSpecialty}>
                    {SPECIALTIES.find((s) => s.value === selectedVet.specialty)
                      ?.label || selectedVet.specialty}
                  </Text>
                  <Text style={styles.modalLocation}>
                    📍 {selectedVet.city}, {selectedVet.country}
                  </Text>
                  <Text style={styles.modalExperience}>
                    {selectedVet.yearsExperience} años de experiencia
                  </Text>
                  {selectedVet.professionalDescription && (
                    <Text style={styles.modalDescription}>
                      {selectedVet.professionalDescription}
                    </Text>
                  )}
                  {selectedVet.languages && selectedVet.languages.length > 0 && (
                    <Text style={styles.modalLanguages}>
                      Idiomas: {selectedVet.languages.join(', ')}
                    </Text>
                  )}
                  <View style={styles.modalRating}>
                    <Text style={styles.modalRatingText}>
                      {renderStars(selectedVet.averageRating || 0)}{' '}
                      {(selectedVet.averageRating || 0).toFixed(1)}
                    </Text>
                    <Text style={styles.modalConsultations}>
                      {selectedVet.totalConsultations || 0} consultas realizadas
                    </Text>
                  </View>
                  <View style={styles.modalPricesContainer}>
                    <Text style={styles.modalPriceLabel}>Precios:</Text>
                    <Text style={styles.modalPrice}>
                      💬 Chat: ${(selectedVet.priceChat || 0).toFixed(2)}
                    </Text>
                    <Text style={styles.modalPrice}>
                      📞 Voz: ${(selectedVet.priceVoice || 0).toFixed(2)}
                    </Text>
                    <Text style={styles.modalPrice}>
                      📹 Video: ${(selectedVet.priceVideo || 0).toFixed(2)}
                    </Text>
                    {!selectedVet.priceChat && !selectedVet.priceVoice && !selectedVet.priceVideo && selectedVet.pricePerConsultation && (
                      <Text style={styles.modalPrice}>
                        Precio: ${(selectedVet.pricePerConsultation || 0).toFixed(2)}
                      </Text>
                    )}
                  </View>
                </ScrollView>
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.consultTypeButton, styles.chatButton]}
                    onPress={() => handleStartConsultation('CHAT')}
                  >
                    <Text style={styles.consultTypeButtonText}>💬 Chat</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.consultTypeButton, styles.voiceButton]}
                    onPress={() => handleStartConsultation('VOICE')}
                  >
                    <Text style={styles.consultTypeButtonText}>📞 Voz</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.consultTypeButton, styles.videoButton]}
                    onPress={() => handleStartConsultation('VIDEO')}
                  >
                    <Text style={styles.consultTypeButtonText}>📹 Video</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowVetModal(false)}
                >
                  <Text style={styles.closeButtonText}>Cerrar</Text>
                </TouchableOpacity>
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
    backgroundColor: '#F5F5F5',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B7FA8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: 20,
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterChipActive: {
    backgroundColor: '#8B7FA8',
    borderColor: '#8B7FA8',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
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
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  vetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vetPhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 12,
  },
  vetPhotoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0E6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  vetPhotoIcon: {
    fontSize: 40,
  },
  vetInfo: {
    flex: 1,
  },
  vetName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  vetSpecialty: {
    fontSize: 14,
    color: '#8B7FA8',
    marginBottom: 4,
  },
  vetLocation: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  vetRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#FF9800',
    marginRight: 8,
  },
  consultationsText: {
    fontSize: 12,
    color: '#999',
  },
  vetPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    marginTop: 4,
  },
  consultButton: {
    backgroundColor: '#8B7FA8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  consultButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalPhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalPhotoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F0E6FF',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalPhotoIcon: {
    fontSize: 60,
  },
  modalName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSpecialty: {
    fontSize: 16,
    color: '#8B7FA8',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalLocation: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalExperience: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalDescription: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalLanguages: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalRating: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalRatingText: {
    fontSize: 18,
    color: '#FF9800',
    marginBottom: 4,
  },
  modalConsultations: {
    fontSize: 12,
    color: '#999',
  },
  modalPricesContainer: {
    marginBottom: 20,
  },
  modalPriceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  consultTypeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  chatButton: {
    backgroundColor: '#4CAF50',
  },
  voiceButton: {
    backgroundColor: '#2196F3',
  },
  videoButton: {
    backgroundColor: '#FF9800',
  },
  consultTypeButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  closeButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#666',
    fontWeight: '600',
  },
});

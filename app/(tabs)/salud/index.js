import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as api from '../../../services/api';

const TABS = {
  VACCINES: 'VACCINES',
  DEWORMINGS: 'DEWORMINGS',
  ALLERGIES: 'ALLERGIES',
  HISTORY: 'HISTORY',
};

export default function SaludScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(TABS.VACCINES);
  const [pets, setPets] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null);
  const [vaccines, setVaccines] = useState([]);
  const [dewormings, setDewormings] = useState([]);
  const [allergies, setAllergies] = useState([]);
  const [healthHistory, setHealthHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingPets, setLoadingPets] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [formData, setFormData] = useState({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerField, setDatePickerField] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Cargar mascotas cuando el componente se monta
  useEffect(() => {
    loadPets();
  }, []);

  // Recargar mascotas cada vez que la pantalla recibe foco (cuando el usuario navega a ella)
  useFocusEffect(
    useCallback(() => {
      loadPets();
    }, [])
  );

  useEffect(() => {
    if (selectedPet) {
      loadAllData();
    }
  }, [selectedPet, activeTab]);

  const loadPets = async () => {
    try {
      setLoadingPets(true);
      const data = await api.getPets();
      setPets(data);
      
      // Si hay mascotas y no hay una seleccionada, seleccionar la primera
      if (data.length > 0 && !selectedPet) {
        setSelectedPet(data[0]);
      }
      // Si hay una mascota seleccionada, verificar que aún existe en la lista
      // y actualizarla con los datos frescos
      else if (selectedPet && data.length > 0) {
        const updatedPet = data.find(p => p.id === selectedPet.id);
        if (updatedPet) {
          // Actualizar la mascota seleccionada con datos frescos
          setSelectedPet(updatedPet);
        } else {
          // Si la mascota seleccionada ya no existe, seleccionar la primera
          setSelectedPet(data[0]);
        }
      }
      // Si no hay mascotas, limpiar la selección
      else if (data.length === 0) {
        setSelectedPet(null);
      }
    } catch (error) {
      console.error('Error cargando mascotas:', error);
      Alert.alert('Error', 'No se pudieron cargar las mascotas');
    } finally {
      setLoadingPets(false);
    }
  };

  const loadAllData = async () => {
    if (!selectedPet) return;
    try {
      setLoadingData(true);
      const [vaccinesData, dewormingsData, allergiesData, historyData] = await Promise.all([
        api.getVaccinesByPet(selectedPet.id),
        api.getDewormingsByPet(selectedPet.id),
        api.getAllergiesByPet(selectedPet.id),
        api.getHealthHistoryByPet(selectedPet.id),
      ]);
      setVaccines(vaccinesData);
      setDewormings(dewormingsData);
      setAllergies(allergiesData);
      setHealthHistory(historyData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  const openDatePicker = (field) => {
    // Si ya hay una fecha, usarla; si no, usar la fecha actual
    const currentValue = formData[field];
    if (currentValue) {
      setSelectedDate(new Date(currentValue));
    } else {
      setSelectedDate(new Date());
    }
    setDatePickerField(field);
    setShowDatePicker(true);
  };

  const handleDateChange = (event, date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
      // Formatear como YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      handleChange(datePickerField, formattedDate);
    }
  };

  const formatDateDisplay = (dateString) => {
    if (!dateString) return 'Seleccionar fecha';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const openModal = (type) => {
    setModalType(type);
    // Inicializar formulario según el tipo
    if (type === 'vaccine') {
      setFormData({
        name: '',
        appliedDate: new Date().toISOString().split('T')[0],
        nextDose: '',
        veterinary: '',
        observations: '',
      });
    } else if (type === 'deworming') {
      setFormData({
        type: 'INTERNAL',
        product: '',
        appliedDate: new Date().toISOString().split('T')[0],
        nextDate: '',
        observations: '',
      });
    } else if (type === 'allergy') {
      setFormData({
        type: 'FOOD',
        description: '',
        severity: 'MILD',
      });
    } else if (type === 'history') {
      setFormData({
        reason: '',
        diagnosis: '',
        treatment: '',
        medications: '',
        date: new Date().toISOString().split('T')[0],
        veterinarian: '',
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!selectedPet) {
      Alert.alert('Error', 'Por favor, selecciona una mascota');
      return;
    }

    setLoading(true);
    try {
      if (modalType === 'vaccine') {
        if (!formData.name.trim()) {
          Alert.alert('Error', 'Por favor, ingresa el nombre de la vacuna');
          return;
        }
        await api.createVaccine({
          ...formData,
          petId: selectedPet.id,
        });
        Alert.alert('Éxito', 'Vacuna registrada correctamente');
      } else if (modalType === 'deworming') {
        if (!formData.product.trim()) {
          Alert.alert('Error', 'Por favor, ingresa el producto utilizado');
          return;
        }
        await api.createDeworming({
          ...formData,
          petId: selectedPet.id,
        });
        Alert.alert('Éxito', 'Desparasitante registrado correctamente');
      } else if (modalType === 'allergy') {
        if (!formData.description.trim()) {
          Alert.alert('Error', 'Por favor, ingresa la descripción de la alergia');
          return;
        }
        await api.createAllergy({
          ...formData,
          petId: selectedPet.id,
        });
        Alert.alert('Éxito', 'Alergia registrada correctamente');
      } else if (modalType === 'history') {
        if (!formData.reason.trim()) {
          Alert.alert('Error', 'Por favor, ingresa el motivo de la consulta');
          return;
        }
        await api.createHealthHistory({
          ...formData,
          petId: selectedPet.id,
        });
        Alert.alert('Éxito', 'Registro de historial guardado correctamente');
      }

      setShowModal(false);
      await loadAllData();
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo guardar el registro');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderTabContent = () => {
    if (loadingData) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B7FA8" />
        </View>
      );
    }

    switch (activeTab) {
      case TABS.VACCINES:
        return (
          <View>
            {vaccines.length === 0 ? (
              <Text style={styles.emptyText}>No hay vacunas registradas</Text>
            ) : (
              vaccines.map((vaccine) => (
                <View key={vaccine.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{vaccine.name}</Text>
                    <Text style={styles.cardDate}>{formatDate(vaccine.appliedDate)}</Text>
                  </View>
                  {vaccine.veterinary && (
                    <Text style={styles.cardDetail}>Veterinaria: {vaccine.veterinary}</Text>
                  )}
                  {vaccine.nextDose && (
                    <Text style={styles.cardDetail}>Próxima dosis: {formatDate(vaccine.nextDose)}</Text>
                  )}
                  {vaccine.observations && (
                    <Text style={styles.cardObservations}>{vaccine.observations}</Text>
                  )}
                </View>
              ))
            )}
          </View>
        );

      case TABS.DEWORMINGS:
        return (
          <View>
            {dewormings.length === 0 ? (
              <Text style={styles.emptyText}>No hay desparasitantes registrados</Text>
            ) : (
              dewormings.map((deworming) => (
                <View key={deworming.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{deworming.product}</Text>
                    <Text style={styles.cardDate}>{formatDate(deworming.appliedDate)}</Text>
                  </View>
                  <Text style={styles.cardDetail}>
                    Tipo: {deworming.type === 'INTERNAL' ? 'Interno' : 'Externo'}
                  </Text>
                  {deworming.nextDate && (
                    <Text style={styles.cardDetail}>Próxima fecha: {formatDate(deworming.nextDate)}</Text>
                  )}
                  {deworming.observations && (
                    <Text style={styles.cardObservations}>{deworming.observations}</Text>
                  )}
                </View>
              ))
            )}
          </View>
        );

      case TABS.ALLERGIES:
        return (
          <View>
            {allergies.length === 0 ? (
              <Text style={styles.emptyText}>No hay alergias registradas</Text>
            ) : (
              allergies.map((allergy) => (
                <View key={allergy.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>
                      {allergy.type === 'FOOD' ? 'Alimento' : allergy.type === 'ENVIRONMENTAL' ? 'Ambiental' : 'Medicamento'}
                    </Text>
                    <Text style={[styles.badge, styles[`badge${allergy.severity}`]]}>
                      {allergy.severity === 'MILD' ? 'Leve' : allergy.severity === 'MODERATE' ? 'Moderado' : 'Grave'}
                    </Text>
                  </View>
                  <Text style={styles.cardDetail}>{allergy.description}</Text>
                </View>
              ))
            )}
          </View>
        );

      case TABS.HISTORY:
        return (
          <View>
            {healthHistory.length === 0 ? (
              <Text style={styles.emptyText}>No hay registros de historial</Text>
            ) : (
              healthHistory.map((record) => (
                <View key={record.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{record.reason}</Text>
                    <Text style={styles.cardDate}>{formatDate(record.date)}</Text>
                  </View>
                  {record.veterinarian && (
                    <Text style={styles.cardDetail}>Veterinario: {record.veterinarian}</Text>
                  )}
                  {record.diagnosis && (
                    <Text style={styles.cardDetail}>Diagnóstico: {record.diagnosis}</Text>
                  )}
                  {record.treatment && (
                    <Text style={styles.cardDetail}>Tratamiento: {record.treatment}</Text>
                  )}
                  {record.medications && (
                    <Text style={styles.cardDetail}>Medicamentos: {record.medications}</Text>
                  )}
                </View>
              ))
            )}
          </View>
        );

      default:
        return null;
    }
  };

  const renderModal = () => {
    if (!showModal) return null;

    return (
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {modalType === 'vaccine' && 'Registrar Vacuna'}
              {modalType === 'deworming' && 'Registrar Desparasitante'}
              {modalType === 'allergy' && 'Registrar Alergia'}
              {modalType === 'history' && 'Registrar en Historial'}
            </Text>

            <ScrollView style={styles.modalScroll}>
              {modalType === 'vaccine' && (
                <>
                  <Text style={styles.label}>Nombre de la Vacuna *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.name}
                    onChangeText={(value) => handleChange('name', value)}
                    placeholder="Ej: Rabia, Triple, etc."
                  />
                  <Text style={styles.label}>Fecha de Aplicación *</Text>
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => openDatePicker('appliedDate')}
                  >
                    <Text style={formData.appliedDate ? styles.dateText : styles.datePlaceholder}>
                      {formatDateDisplay(formData.appliedDate)}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.label}>Próxima Dosis</Text>
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => openDatePicker('nextDose')}
                  >
                    <Text style={formData.nextDose ? styles.dateText : styles.datePlaceholder}>
                      {formatDateDisplay(formData.nextDose)}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.label}>Veterinaria</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.veterinary}
                    onChangeText={(value) => handleChange('veterinary', value)}
                    placeholder="Nombre de la veterinaria"
                  />
                  <Text style={styles.label}>Observaciones</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formData.observations}
                    onChangeText={(value) => handleChange('observations', value)}
                    placeholder="Notas adicionales..."
                    multiline
                    numberOfLines={3}
                  />
                </>
              )}

              {modalType === 'deworming' && (
                <>
                  <Text style={styles.label}>Tipo *</Text>
                  <View style={styles.pickerContainer}>
                    {['INTERNAL', 'EXTERNAL'].map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.optionButton,
                          formData.type === type && styles.optionButtonActive,
                        ]}
                        onPress={() => handleChange('type', type)}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            formData.type === type && styles.optionTextActive,
                          ]}
                        >
                          {type === 'INTERNAL' ? 'Interno' : 'Externo'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.label}>Producto Utilizado *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.product}
                    onChangeText={(value) => handleChange('product', value)}
                    placeholder="Ej: Drontal, Frontline, etc."
                  />
                  <Text style={styles.label}>Fecha Aplicada *</Text>
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => openDatePicker('appliedDate')}
                  >
                    <Text style={formData.appliedDate ? styles.dateText : styles.datePlaceholder}>
                      {formatDateDisplay(formData.appliedDate)}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.label}>Próxima Fecha Recomendada</Text>
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => openDatePicker('nextDate')}
                  >
                    <Text style={formData.nextDate ? styles.dateText : styles.datePlaceholder}>
                      {formatDateDisplay(formData.nextDate)}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.label}>Observaciones</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formData.observations}
                    onChangeText={(value) => handleChange('observations', value)}
                    placeholder="Notas adicionales..."
                    multiline
                    numberOfLines={3}
                  />
                </>
              )}

              {modalType === 'allergy' && (
                <>
                  <Text style={styles.label}>Tipo de Alergia *</Text>
                  <View style={styles.pickerContainer}>
                    {[
                      { value: 'FOOD', label: 'Alimento' },
                      { value: 'ENVIRONMENTAL', label: 'Ambiental' },
                      { value: 'MEDICATION', label: 'Medicamento' },
                    ].map((type) => (
                      <TouchableOpacity
                        key={type.value}
                        style={[
                          styles.optionButton,
                          formData.type === type.value && styles.optionButtonActive,
                        ]}
                        onPress={() => handleChange('type', type.value)}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            formData.type === type.value && styles.optionTextActive,
                          ]}
                        >
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.label}>Descripción *</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formData.description}
                    onChangeText={(value) => handleChange('description', value)}
                    placeholder="Describe la alergia..."
                    multiline
                    numberOfLines={3}
                  />
                  <Text style={styles.label}>Nivel de Gravedad *</Text>
                  <View style={styles.pickerContainer}>
                    {[
                      { value: 'MILD', label: 'Leve' },
                      { value: 'MODERATE', label: 'Moderado' },
                      { value: 'SEVERE', label: 'Grave' },
                    ].map((severity) => (
                      <TouchableOpacity
                        key={severity.value}
                        style={[
                          styles.optionButton,
                          formData.severity === severity.value && styles.optionButtonActive,
                        ]}
                        onPress={() => handleChange('severity', severity.value)}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            formData.severity === severity.value && styles.optionTextActive,
                          ]}
                        >
                          {severity.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {modalType === 'history' && (
                <>
                  <Text style={styles.label}>Motivo *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.reason}
                    onChangeText={(value) => handleChange('reason', value)}
                    placeholder="Motivo de la consulta"
                  />
                  <Text style={styles.label}>Fecha *</Text>
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => openDatePicker('date')}
                  >
                    <Text style={formData.date ? styles.dateText : styles.datePlaceholder}>
                      {formatDateDisplay(formData.date)}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.label}>Veterinario</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.veterinarian}
                    onChangeText={(value) => handleChange('veterinarian', value)}
                    placeholder="Nombre del veterinario"
                  />
                  <Text style={styles.label}>Diagnóstico</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formData.diagnosis}
                    onChangeText={(value) => handleChange('diagnosis', value)}
                    placeholder="Diagnóstico..."
                    multiline
                    numberOfLines={2}
                  />
                  <Text style={styles.label}>Tratamiento</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formData.treatment}
                    onChangeText={(value) => handleChange('treatment', value)}
                    placeholder="Tratamiento aplicado..."
                    multiline
                    numberOfLines={2}
                  />
                  <Text style={styles.label}>Medicamentos</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formData.medications}
                    onChangeText={(value) => handleChange('medications', value)}
                    placeholder="Medicamentos recetados..."
                    multiline
                    numberOfLines={2}
                  />
                </>
              )}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, loading && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      {/* Selector de Mascota */}
      <View style={styles.petSelector}>
        {loadingPets ? (
          <ActivityIndicator size="small" color="#8B7FA8" />
        ) : pets.length === 0 ? (
          <Text style={styles.emptyText}>No tienes mascotas registradas</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.petScroll}>
            {pets.map((pet) => (
              <TouchableOpacity
                key={pet.id}
                style={[
                  styles.petButton,
                  selectedPet?.id === pet.id && styles.petButtonActive,
                ]}
                onPress={() => setSelectedPet(pet)}
              >
                <Text
                  style={[
                    styles.petButtonText,
                  selectedPet?.id === pet.id && styles.petButtonTextActive,
                  ]}
                >
                  {pet.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
          {Object.entries({
            [TABS.VACCINES]: '💉 Vacunas',
            [TABS.DEWORMINGS]: '🐛 Desparasitantes',
            [TABS.ALLERGIES]: '⚠️ Alergias',
            [TABS.HISTORY]: '📋 Historial',
          }).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[styles.tab, activeTab === key && styles.tabActive]}
              onPress={() => setActiveTab(key)}
            >
              <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity
          style={styles.remindersButton}
          onPress={() => router.push('recordatorios')}
        >
          <Text style={styles.remindersButtonText}>🔔</Text>
        </TouchableOpacity>
      </View>

      {/* Contenido */}
      <ScrollView style={styles.content}>
        {selectedPet ? (
          <>
            {renderTabContent()}
            {/* Botón flotante */}
            <TouchableOpacity
              style={styles.fab}
              onPress={() => {
                if (activeTab === TABS.VACCINES) openModal('vaccine');
                else if (activeTab === TABS.DEWORMINGS) openModal('deworming');
                else if (activeTab === TABS.ALLERGIES) openModal('allergy');
                else if (activeTab === TABS.HISTORY) openModal('history');
              }}
            >
              <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.emptyText}>Selecciona una mascota</Text>
        )}
      </ScrollView>

      {renderModal()}
      
      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  petSelector: {
    padding: 16,
    backgroundColor: '#F8F8F8',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  petScroll: {
    marginTop: 8,
  },
  petButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginRight: 12,
  },
  petButtonActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#8B7FA8',
  },
  petButtonText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  petButtonTextActive: {
    color: '#8B7FA8',
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8F8F8',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    alignItems: 'center',
  },
  tabs: {
    flex: 1,
  },
  remindersButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderLeftWidth: 1,
    borderLeftColor: '#E0E0E0',
  },
  remindersButtonText: {
    fontSize: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#8B7FA8',
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#8B7FA8',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    padding: 40,
  },
  card: {
    backgroundColor: '#F0E6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  cardDate: {
    fontSize: 14,
    color: '#8B7FA8',
    fontWeight: '500',
  },
  cardDetail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  cardObservations: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  badgeMILD: {
    backgroundColor: '#E8F5E9',
    color: '#4CAF50',
  },
  badgeMODERATE: {
    backgroundColor: '#FFF3E0',
    color: '#FF9800',
  },
  badgeSEVERE: {
    backgroundColor: '#FFEBEE',
    color: '#F44336',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8B7FA8',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
  },
  modalScroll: {
    maxHeight: 400,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    color: '#333',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  optionButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F8F8F8',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  optionButtonActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#8B7FA8',
  },
  optionText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  optionTextActive: {
    color: '#8B7FA8',
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F8F8F8',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#8B7FA8',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  dateText: {
    fontSize: 15,
    color: '#333',
  },
  datePlaceholder: {
    fontSize: 15,
    color: '#999',
  },
});

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
} from 'react-native';
import * as api from '../services/api';

export default function MascotaScreen() {
  const [formData, setFormData] = useState({
    nombre: '',
    especie: 'Perro',
    raza: '',
  });
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingPets, setLoadingPets] = useState(true);

  // Cargar mascotas al montar el componente
  useEffect(() => {
    loadPets();
  }, []);

  const loadPets = async () => {
    try {
      setLoadingPets(true);
      const data = await api.getPets();
      setPets(data);
    } catch (error) {
      console.error('Error cargando mascotas:', error);
      Alert.alert('Error', 'No se pudieron cargar las mascotas');
    } finally {
      setLoadingPets(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  const handleSave = async () => {
    if (!formData.nombre.trim()) {
      Alert.alert('Error', 'Por favor, ingresa el nombre de tu mascota');
      return;
    }

    setLoading(true);
    try {
      const petData = {
        name: formData.nombre,
        type: formData.especie,
        breed: formData.raza || undefined,
      };

      await api.createPet(petData);
      Alert.alert('Éxito', 'Mascota guardada correctamente');
      
      // Limpiar formulario
      setFormData({
        nombre: '',
        especie: 'Perro',
        raza: '',
      });
      
      // Recargar mascotas
      await loadPets();
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo guardar la mascota');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.formContainer}>
        <Text style={styles.label}>Nombre de la mascota</Text>
        <TextInput
          style={styles.input}
          value={formData.nombre}
          onChangeText={(value) => handleChange('nombre', value)}
          placeholder="Ej: Max"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Especie</Text>
        <View style={styles.pickerContainer}>
          <TouchableOpacity
            style={[
              styles.optionButton,
              formData.especie === 'Perro' && styles.optionButtonActive,
            ]}
            onPress={() => handleChange('especie', 'Perro')}
          >
            <Text
              style={[
                styles.optionText,
                formData.especie === 'Perro' && styles.optionTextActive,
              ]}
            >
              Perro
            </Text>
            </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.optionButton,
              styles.optionButtonLast,
              formData.especie === 'Gato' && styles.optionButtonActive,
            ]}
            onPress={() => handleChange('especie', 'Gato')}
          >
            <Text
              style={[
                styles.optionText,
                formData.especie === 'Gato' && styles.optionTextActive,
              ]}
            >
              Gato
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Raza (opcional)</Text>
        <TextInput
          style={styles.input}
          value={formData.raza}
          onChangeText={(value) => handleChange('raza', value)}
          placeholder="Ej: Labrador"
          placeholderTextColor="#999"
        />

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.buttonDisabled]}
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

      <View style={styles.petsContainer}>
        <Text style={styles.petsTitle}>Mis Mascotas</Text>
        {loadingPets ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B7FA8" />
            </View>
        ) : pets.length === 0 ? (
          <Text style={styles.emptyText}>No tienes mascotas registradas</Text>
        ) : (
          pets.map((pet) => (
            <View key={pet.id} style={styles.petCard}>
              <View style={styles.petHeader}>
                <Text style={styles.petName}>{pet.name}</Text>
                <Text style={styles.petSpecies}>{pet.type}</Text>
            </View>
              <View style={styles.petDetails}>
                {pet.breed && (
                  <Text style={styles.petDetail}>Raza: {pet.breed}</Text>
                )}
            </View>
            </View>
          ))
        )}
        </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 20,
  },
  formContainer: {
    marginBottom: 30,
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
  pickerContainer: {
    flexDirection: 'row',
  },
  optionButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F8F8F8',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    marginRight: 12,
  },
  optionButtonLast: {
    marginRight: 0,
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
  saveButton: {
    backgroundColor: '#8B7FA8',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  savedContainer: {
    marginTop: 20,
  },
  savedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  savedCard: {
    backgroundColor: '#F0E6FF',
    borderRadius: 12,
    padding: 16,
  },
  savedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  savedLabel: {
    fontSize: 15,
    color: '#5A4A6F',
    fontWeight: '500',
  },
  savedValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
  },
  petsContainer: {
    marginTop: 30,
  },
  petsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    padding: 20,
  },
  petCard: {
    backgroundColor: '#F0E6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  petHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  petName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  petSpecies: {
    fontSize: 14,
    color: '#8B7FA8',
    fontWeight: '500',
  },
  petDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  petDetail: {
    fontSize: 14,
    color: '#666',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

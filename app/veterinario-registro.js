import { useState } from 'react';
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
import { useRouter } from 'expo-router';
import * as api from '../services/api';
import * as ImagePicker from 'expo-image-picker';

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

const LANGUAGES = ['Español', 'Inglés', 'Francés', 'Portugués', 'Alemán', 'Italiano'];

export default function VeterinarioRegistroScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    country: '',
    city: '',
    specialty: 'GENERAL',
    yearsExperience: '',
    professionalDescription: '',
    languages: [],
    pricePerConsultation: '',
    profilePhoto: null,
  });

  const handleLanguageToggle = (language) => {
    setFormData((prev) => ({
      ...prev,
      languages: prev.languages.includes(language)
        ? prev.languages.filter((l) => l !== language)
        : [...prev.languages, language],
    }));
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisos', 'Se necesitan permisos para acceder a la galería');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      // Subir imagen al servidor
      try {
        const formData = new FormData();
        const uri = result.assets[0].uri;
        const filename = uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('photo', {
          uri,
          name: filename,
          type,
        });

        const uploadResponse = await api.uploadPetPhoto(formData);
        setFormData((prev) => ({
          ...prev,
          profilePhoto: uploadResponse.url,
        }));
      } catch (error) {
        Alert.alert('Error', 'No se pudo subir la imagen');
      }
    }
  };

  const handleSubmit = async () => {
    // Validaciones
    if (
      !formData.fullName.trim() ||
      !formData.country.trim() ||
      !formData.city.trim() ||
      !formData.yearsExperience ||
      !formData.pricePerConsultation ||
      formData.languages.length === 0
    ) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return;
    }

    if (parseInt(formData.yearsExperience) < 0) {
      Alert.alert('Error', 'Los años de experiencia deben ser un número válido');
      return;
    }

    if (parseFloat(formData.pricePerConsultation) <= 0) {
      Alert.alert('Error', 'El precio por consulta debe ser mayor a 0');
      return;
    }

    setLoading(true);
    try {
      const veterinarianData = {
        fullName: formData.fullName,
        country: formData.country,
        city: formData.city,
        specialty: formData.specialty,
        yearsExperience: parseInt(formData.yearsExperience),
        professionalDescription: formData.professionalDescription || undefined,
        languages: formData.languages,
        profilePhoto: formData.profilePhoto || undefined,
        pricePerConsultation: parseFloat(formData.pricePerConsultation),
      };

      await api.createVeterinarian(veterinarianData);
      Alert.alert(
        'Éxito',
        'Perfil de veterinario creado. Está pendiente de verificación.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/index'),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo crear el perfil de veterinario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>👨‍⚕️ Completa tu Perfil</Text>
        <Text style={styles.subtitle}>
          Completa tu información profesional para comenzar a recibir consultas
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Nombre Completo *</Text>
        <TextInput
          style={styles.input}
          value={formData.fullName}
          onChangeText={(text) => setFormData({ ...formData, fullName: text })}
          placeholder="Dr. Juan Pérez"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>País *</Text>
        <TextInput
          style={styles.input}
          value={formData.country}
          onChangeText={(text) => setFormData({ ...formData, country: text })}
          placeholder="Colombia"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Ciudad *</Text>
        <TextInput
          style={styles.input}
          value={formData.city}
          onChangeText={(text) => setFormData({ ...formData, city: text })}
          placeholder="Bogotá"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Especialidad *</Text>
        <View style={styles.specialtyContainer}>
          {SPECIALTIES.map((spec) => (
            <TouchableOpacity
              key={spec.value}
              style={[
                styles.specialtyButton,
                formData.specialty === spec.value && styles.specialtyButtonActive,
              ]}
              onPress={() => setFormData({ ...formData, specialty: spec.value })}
            >
              <Text
                style={[
                  styles.specialtyText,
                  formData.specialty === spec.value && styles.specialtyTextActive,
                ]}
              >
                {spec.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Años de Experiencia *</Text>
        <TextInput
          style={styles.input}
          value={formData.yearsExperience}
          onChangeText={(text) => setFormData({ ...formData, yearsExperience: text })}
          placeholder="5"
          keyboardType="numeric"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Descripción Profesional</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.professionalDescription}
          onChangeText={(text) => setFormData({ ...formData, professionalDescription: text })}
          placeholder="Cuéntanos sobre tu experiencia y especialidades..."
          placeholderTextColor="#999"
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Idiomas *</Text>
        <View style={styles.languagesContainer}>
          {LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang}
              style={[
                styles.languageButton,
                formData.languages.includes(lang) && styles.languageButtonActive,
              ]}
              onPress={() => handleLanguageToggle(lang)}
            >
              <Text
                style={[
                  styles.languageText,
                  formData.languages.includes(lang) && styles.languageTextActive,
                ]}
              >
                {lang}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Precio por Consulta *</Text>
        <TextInput
          style={styles.input}
          value={formData.pricePerConsultation}
          onChangeText={(text) => setFormData({ ...formData, pricePerConsultation: text })}
          placeholder="50.00"
          keyboardType="decimal-pad"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Foto de Perfil</Text>
        <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
          {formData.profilePhoto ? (
            <Text style={styles.photoButtonText}>✓ Foto seleccionada</Text>
          ) : (
            <Text style={styles.photoButtonText}>📷 Seleccionar Foto</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Completar Registro</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.note}>
          * Campos obligatorios{'\n'}
          Tu perfil quedará pendiente de verificación antes de aparecer en la búsqueda.
        </Text>
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
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  form: {
    width: '100%',
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
    height: 100,
    textAlignVertical: 'top',
  },
  specialtyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specialtyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 8,
  },
  specialtyButtonActive: {
    backgroundColor: '#8B7FA8',
    borderColor: '#8B7FA8',
  },
  specialtyText: {
    fontSize: 14,
    color: '#666',
  },
  specialtyTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  languagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  languageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 8,
  },
  languageButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  languageText: {
    fontSize: 14,
    color: '#666',
  },
  languageTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  photoButton: {
    backgroundColor: '#F0E6FF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#8B7FA8',
    borderStyle: 'dashed',
    alignItems: 'center',
    marginBottom: 8,
  },
  photoButtonText: {
    color: '#8B7FA8',
    fontSize: 15,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#8B7FA8',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
});

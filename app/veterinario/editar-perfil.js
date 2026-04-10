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
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import * as api from '../../services/api';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

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

export default function EditarPerfilVeterinarioScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    country: '',
    city: '',
    specialty: 'GENERAL',
    yearsExperience: '',
    professionalDescription: '',
    languages: [],
    priceChat: '',
    priceVoice: '',
    priceVideo: '',
    profilePhoto: null,
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const profile = await api.getMyVeterinarianProfile();
      
      setFormData({
        fullName: profile.fullName || '',
        country: profile.country || '',
        city: profile.city || '',
        specialty: profile.specialty || 'GENERAL',
        yearsExperience: profile.yearsExperience?.toString() || '',
        professionalDescription: profile.professionalDescription || '',
        languages: profile.languages || [],
        priceChat: profile.priceChat?.toString() || '',
        priceVoice: profile.priceVoice?.toString() || '',
        priceVideo: profile.priceVideo?.toString() || '',
        profilePhoto: profile.profilePhoto || null,
      });
    } catch (error) {
      console.error('Error cargando perfil:', error);
      // Si no existe perfil, permitir que el usuario lo cree
      // No hacer router.back(), dejar que el formulario esté vacío para crear
      if (error.message && error.message.includes('No tienes un perfil')) {
        // El formulario ya está vacío, solo continuar
        console.log('No existe perfil, se puede crear uno nuevo');
      } else {
        Alert.alert('Error', 'No se pudo cargar el perfil');
        router.back();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageToggle = (language) => {
    setFormData((prev) => ({
      ...prev,
      languages: prev.languages.includes(language)
        ? prev.languages.filter((l) => l !== language)
        : [...prev.languages, language],
    }));
  };

  const pickImage = async () => {
    try {
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
        setUploadingPhoto(true);
        try {
          const formDataUpload = new FormData();
          formDataUpload.append('photo', {
            uri: result.assets[0].uri,
            type: 'image/jpeg',
            name: `vet_profile_${Date.now()}.jpg`,
          });

          const uploadResponse = await api.uploadVeterinarianPhoto(formDataUpload);
          
          setFormData({
            ...formData,
            profilePhoto: uploadResponse.url,
          });

          Alert.alert('Éxito', 'Foto actualizada correctamente');
        } catch (error) {
          console.error('Error subiendo foto:', error);
          Alert.alert('Error', error.message || 'No se pudo subir la foto');
        } finally {
          setUploadingPhoto(false);
        }
      }
    } catch (error) {
      console.error('Error seleccionando imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const removePhoto = () => {
    Alert.alert(
      'Eliminar foto',
      '¿Estás seguro de que quieres eliminar tu foto de perfil?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            setFormData({
              ...formData,
              profilePhoto: null,
            });
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    // Validaciones
    if (!formData.fullName.trim()) {
      Alert.alert('Error', 'El nombre completo es requerido');
      return;
    }
    if (!formData.country.trim()) {
      Alert.alert('Error', 'El país es requerido');
      return;
    }
    if (!formData.city.trim()) {
      Alert.alert('Error', 'La ciudad es requerida');
      return;
    }
    if (!formData.yearsExperience || parseInt(formData.yearsExperience) < 0) {
      Alert.alert('Error', 'Los años de experiencia son requeridos');
      return;
    }
    if (formData.languages.length === 0) {
      Alert.alert('Error', 'Selecciona al menos un idioma');
      return;
    }

    try {
      setSaving(true);
      
      const updateData = {
        fullName: formData.fullName.trim(),
        country: formData.country.trim(),
        city: formData.city.trim(),
        specialty: formData.specialty,
        yearsExperience: parseInt(formData.yearsExperience),
        professionalDescription: formData.professionalDescription.trim() || undefined,
        languages: formData.languages,
        priceChat: formData.priceChat ? parseFloat(formData.priceChat) : 0,
        priceVoice: formData.priceVoice ? parseFloat(formData.priceVoice) : 0,
        priceVideo: formData.priceVideo ? parseFloat(formData.priceVideo) : 0,
        profilePhoto: formData.profilePhoto || undefined,
      };

      const response = await api.updateVeterinarianProfile(updateData);
      
      // Si el perfil tiene status PENDING, es un perfil nuevo que necesita verificación
      if (response.status === 'PENDING') {
        Alert.alert(
          'Éxito',
          'Perfil de veterinario creado. Está pendiente de verificación.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(tabs)/inicio'),
            },
          ]
        );
      } else {
        Alert.alert('Éxito', 'Perfil actualizado correctamente', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      Alert.alert('Error', error.message || 'No se pudo actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B7FA8" />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Perfil</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.form}>
        {/* Foto de Perfil */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Foto de Perfil</Text>
          <View style={styles.photoSection}>
            {formData.profilePhoto ? (
              <View style={styles.photoPreview}>
                <Image source={{ uri: formData.profilePhoto }} style={styles.photoImage} />
                <TouchableOpacity style={styles.removePhotoButton} onPress={removePhoto}>
                  <Text style={styles.removePhotoText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoPlaceholderText}>👨‍⚕️</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.photoButton}
              onPress={pickImage}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? (
                <ActivityIndicator color="#8B7FA8" />
              ) : (
                <Text style={styles.photoButtonText}>
                  {formData.profilePhoto ? 'Cambiar foto' : 'Agregar foto'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Nombre Completo */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nombre Completo *</Text>
          <TextInput
            style={styles.input}
            value={formData.fullName}
            onChangeText={(text) => setFormData({ ...formData, fullName: text })}
            placeholder="Ej: Dr. Juan Pérez"
          />
        </View>

        {/* País y Ciudad */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>País *</Text>
            <TextInput
              style={styles.input}
              value={formData.country}
              onChangeText={(text) => setFormData({ ...formData, country: text })}
              placeholder="Ej: Colombia"
            />
          </View>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>Ciudad *</Text>
            <TextInput
              style={styles.input}
              value={formData.city}
              onChangeText={(text) => setFormData({ ...formData, city: text })}
              placeholder="Ej: Bogotá"
            />
          </View>
        </View>

        {/* Especialidad */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Especialidad *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsContainer}>
            {SPECIALTIES.map((spec) => (
              <TouchableOpacity
                key={spec.value}
                style={[
                  styles.chip,
                  formData.specialty === spec.value && styles.chipActive,
                ]}
                onPress={() => setFormData({ ...formData, specialty: spec.value })}
              >
                <Text
                  style={[
                    styles.chipText,
                    formData.specialty === spec.value && styles.chipTextActive,
                  ]}
                >
                  {spec.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Años de Experiencia */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Años de Experiencia *</Text>
          <TextInput
            style={styles.input}
            value={formData.yearsExperience}
            onChangeText={(text) => setFormData({ ...formData, yearsExperience: text })}
            placeholder="Ej: 5"
            keyboardType="numeric"
          />
        </View>

        {/* Descripción Profesional */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Descripción Profesional</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.professionalDescription}
            onChangeText={(text) => setFormData({ ...formData, professionalDescription: text })}
            placeholder="Describe tu experiencia y especialidades..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Idiomas */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Idiomas *</Text>
          <View style={styles.languagesContainer}>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[
                  styles.languageChip,
                  formData.languages.includes(lang) && styles.languageChipActive,
                ]}
                onPress={() => handleLanguageToggle(lang)}
              >
                <Text
                  style={[
                    styles.languageChipText,
                    formData.languages.includes(lang) && styles.languageChipTextActive,
                  ]}
                >
                  {lang}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Precios */}
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>Precios por Consulta</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>💬 Precio Chat (COP)</Text>
          <TextInput
            style={styles.input}
            value={formData.priceChat}
            onChangeText={(text) => setFormData({ ...formData, priceChat: text })}
            placeholder="0"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>📞 Precio Voz (COP)</Text>
          <TextInput
            style={styles.input}
            value={formData.priceVoice}
            onChangeText={(text) => setFormData({ ...formData, priceVoice: text })}
            placeholder="0"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>📹 Precio Video (COP)</Text>
          <TextInput
            style={styles.input}
            value={formData.priceVideo}
            onChangeText={(text) => setFormData({ ...formData, priceVideo: text })}
            placeholder="0"
            keyboardType="numeric"
          />
        </View>

        {/* Botón Guardar */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>💾 Guardar Cambios</Text>
          )}
        </TouchableOpacity>
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
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  backButton: {
    width: 100,
  },
  backButtonText: {
    fontSize: 16,
    color: '#8B7FA8',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  textArea: {
    height: 100,
    paddingTop: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  chipsContainer: {
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8F8F8',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  chipActive: {
    backgroundColor: '#8B7FA8',
    borderColor: '#8B7FA8',
  },
  chipText: {
    fontSize: 14,
    color: '#666',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  languagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  languageChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  languageChipActive: {
    backgroundColor: '#8B7FA8',
    borderColor: '#8B7FA8',
  },
  languageChipText: {
    fontSize: 14,
    color: '#666',
  },
  languageChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitleText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B7FA8',
  },
  saveButton: {
    backgroundColor: '#8B7FA8',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  photoSection: {
    alignItems: 'center',
    marginTop: 8,
  },
  photoPreview: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#8B7FA8',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E8E8E8',
  },
  photoPlaceholderText: {
    fontSize: 48,
  },
  photoButton: {
    backgroundColor: '#F8F8F8',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  photoButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});

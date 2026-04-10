import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as api from '../../../services/api';
import AnimatedButton from '../../../components/AnimatedButton';
import AnimatedCard from '../../../components/AnimatedCard';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY, INPUT_STYLES, BUTTON_STYLES } from '../../../styles/theme';

export default function EditarMascotaScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'Perro',
    raza: '',
    sexo: 'UNKNOWN',
    fechaNacimiento: '',
    peso: '',
    color: '',
    foto: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    loadPet();
    requestImagePermission();
  }, [id]);

  const requestImagePermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisos', 'Se necesitan permisos para acceder a la galería');
    }
  };

  const loadPet = async () => {
    try {
      setLoading(true);
      const pet = await api.getPet(parseInt(id));
      setFormData({
        nombre: pet.name || '',
        tipo: pet.type || 'Perro',
        raza: pet.breed || '',
        sexo: pet.sex || 'UNKNOWN',
        fechaNacimiento: pet.birthDate || '',
        peso: pet.weight ? String(pet.weight) : '',
        color: pet.color || '',
        foto: pet.photo || null,
      });
      if (pet.birthDate) {
        setSelectedDate(new Date(pet.birthDate));
      }
    } catch (error) {
      console.error('Error cargando mascota:', error);
      Alert.alert('Error', 'No se pudo cargar la información de la mascota');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  const pickImage = async (source) => {
    try {
      let result;
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permisos', 'Se necesitan permisos para usar la cámara');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]) {
        setFormData({
          ...formData,
          foto: result.assets[0].uri,
        });
      }
    } catch (error) {
      console.error('Error seleccionando imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const uploadPhoto = async (uri) => {
    try {
      setUploadingPhoto(true);
      const formDataObj = new FormData();
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formDataObj.append('photo', {
        uri,
        name: filename,
        type,
      });

      const response = await api.uploadPetPhoto(formDataObj);
      return response.url;
    } catch (error) {
      console.error('Error subiendo foto:', error);
      throw error;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!formData.nombre.trim()) {
      Alert.alert('Error', 'Por favor, ingresa el nombre de tu mascota');
      return;
    }

    if (formData.peso && isNaN(parseFloat(formData.peso))) {
      Alert.alert('Error', 'El peso debe ser un número válido');
      return;
    }

    setSaving(true);
    try {
      let photoUrl = formData.foto;

      // Si hay foto local, subirla primero
      if (formData.foto && !formData.foto.startsWith('http')) {
        photoUrl = await uploadPhoto(formData.foto);
      }

      const petData = {
        name: formData.nombre,
        type: formData.tipo,
        breed: formData.raza || undefined,
        sex: formData.sexo !== 'UNKNOWN' ? formData.sexo : undefined,
        birthDate: formData.fechaNacimiento || undefined,
        weight: formData.peso ? parseFloat(formData.peso) : undefined,
        color: formData.color || undefined,
        photo: photoUrl || undefined,
      };

      await api.updatePet(parseInt(id), petData);
      Alert.alert('Éxito', 'Mascota actualizada correctamente', [
        { text: 'OK', onPress: () => {
          // ✅ Usar router.replace para refrescar la lista
          router.replace('/(tabs)/mascotas');
        }}
      ]);
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo actualizar la mascota');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AnimatedCard style={styles.formCard}>
        <Text style={styles.title}>Editar mascota</Text>

        {/* Foto */}
        <View style={styles.photoSection}>
          <Text style={styles.label}>Foto de la Mascota</Text>
          {formData.foto ? (
            <View style={styles.photoPreview}>
              <Image source={{ uri: formData.foto }} style={styles.photoPreviewImage} />
              <AnimatedButton
                style={styles.removePhotoButton}
                onPress={() => handleChange('foto', null)}
              >
                <Text style={styles.removePhotoText}>✕</Text>
              </AnimatedButton>
            </View>
          ) : (
            <View style={styles.photoButtons}>
              <AnimatedButton
                style={styles.photoButton}
                onPress={() => pickImage('camera')}
              >
                <Text style={styles.photoButtonText}>📷 Cámara</Text>
              </AnimatedButton>
              <AnimatedButton
                style={styles.photoButton}
                onPress={() => pickImage('gallery')}
              >
                <Text style={styles.photoButtonText}>🖼️ Galería</Text>
              </AnimatedButton>
            </View>
          )}
        </View>

        {/* Nombre */}
        <Text style={styles.label}>Nombre de la mascota *</Text>
        <TextInput
          style={styles.input}
          value={formData.nombre}
          onChangeText={(value) => handleChange('nombre', value)}
          placeholder="Ej: Max"
          placeholderTextColor={COLORS.textTertiary}
        />

        {/* Tipo */}
        <Text style={styles.label}>Tipo *</Text>
        <View style={styles.pickerContainer}>
          {['Perro', 'Gato', 'Otro'].map((tipo) => (
            <AnimatedButton
              key={tipo}
              style={[
                styles.optionButton,
                formData.tipo === tipo && styles.optionButtonActive,
              ]}
              onPress={() => handleChange('tipo', tipo)}
            >
              <Text
                style={[
                  styles.optionText,
                  formData.tipo === tipo && styles.optionTextActive,
                ]}
              >
                {tipo}
              </Text>
            </AnimatedButton>
          ))}
        </View>

        {/* Raza */}
        <Text style={styles.label}>Raza</Text>
        <TextInput
          style={styles.input}
          value={formData.raza}
          onChangeText={(value) => handleChange('raza', value)}
          placeholder="Ej: Labrador"
          placeholderTextColor={COLORS.textTertiary}
        />

        {/* Sexo */}
        <Text style={styles.label}>Sexo</Text>
        <View style={styles.pickerContainer}>
          {[
            { value: 'MALE', label: 'Macho' },
            { value: 'FEMALE', label: 'Hembra' },
            { value: 'UNKNOWN', label: 'Desconocido' },
          ].map((sexo) => (
            <AnimatedButton
              key={sexo.value}
              style={[
                styles.optionButton,
                formData.sexo === sexo.value && styles.optionButtonActive,
              ]}
              onPress={() => handleChange('sexo', sexo.value)}
            >
              <Text
                style={[
                  styles.optionText,
                  formData.sexo === sexo.value && styles.optionTextActive,
                ]}
              >
                {sexo.label}
              </Text>
            </AnimatedButton>
          ))}
        </View>

        {/* Fecha de Nacimiento */}
        <Text style={styles.label}>Fecha de Nacimiento</Text>
        <AnimatedButton
          style={styles.input}
          onPress={() => {
            if (formData.fechaNacimiento) {
              setSelectedDate(new Date(formData.fechaNacimiento));
            }
            setShowDatePicker(true);
          }}
        >
          <Text style={formData.fechaNacimiento ? styles.dateText : styles.datePlaceholder}>
            {formData.fechaNacimiento
              ? new Date(formData.fechaNacimiento).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              : 'Seleccionar fecha'}
          </Text>
        </AnimatedButton>
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, date) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (date) {
                setSelectedDate(date);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                handleChange('fechaNacimiento', `${year}-${month}-${day}`);
              }
            }}
            maximumDate={new Date()}
          />
        )}

        {/* Peso */}
        <Text style={styles.label}>Peso (kg)</Text>
        <TextInput
          style={styles.input}
          value={formData.peso}
          onChangeText={(value) => handleChange('peso', value)}
          placeholder="Ej: 15.5"
          keyboardType="numeric"
          placeholderTextColor={COLORS.textTertiary}
        />

        {/* Color */}
        <Text style={styles.label}>Color</Text>
        <TextInput
          style={styles.input}
          value={formData.color}
          onChangeText={(value) => handleChange('color', value)}
          placeholder="Ej: Marrón, Blanco, etc."
          placeholderTextColor={COLORS.textTertiary}
        />

        {/* Botón Guardar */}
        <AnimatedButton
          style={[styles.saveButton, (saving || uploadingPhoto) && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving || uploadingPhoto}
        >
          {saving || uploadingPhoto ? (
            <ActivityIndicator color={COLORS.textWhite} />
          ) : (
            <Text style={styles.saveButtonText}>Guardar cambios</Text>
          )}
        </AnimatedButton>
      </AnimatedCard>
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
  },
  formCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xxl,
    ...SHADOWS.lg,
  },
  title: {
    ...TYPOGRAPHY.h3,
    marginBottom: SPACING.xl,
  },
  photoSection: {
    marginBottom: SPACING.xl,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  photoButton: {
    flex: 1,
    backgroundColor: COLORS.backgroundTertiary,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    minHeight: 52,
    justifyContent: 'center',
  },
  photoButtonText: {
    ...TYPOGRAPHY.body,
    fontWeight: '500',
  },
  photoPreview: {
    position: 'relative',
    width: 160,
    height: 160,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    alignSelf: 'center',
    ...SHADOWS.md,
  },
  photoPreviewImage: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: BORDER_RADIUS.round,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoText: {
    color: COLORS.textWhite,
    fontSize: 20,
    fontWeight: 'bold',
  },
  label: {
    ...TYPOGRAPHY.bodyBold,
    marginBottom: SPACING.sm,
    marginTop: SPACING.lg,
  },
  input: {
    ...INPUT_STYLES.default,
    justifyContent: 'center',
  },
  pickerContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  optionButton: {
    flex: 1,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.backgroundTertiary,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  optionButtonActive: {
    backgroundColor: '#E8F5E9',
    borderColor: COLORS.primary,
  },
  optionText: {
    ...TYPOGRAPHY.body,
    fontWeight: '500',
  },
  optionTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  saveButton: {
    ...BUTTON_STYLES.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xxl,
  },
  saveButtonText: {
    ...TYPOGRAPHY.button,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  dateText: {
    ...TYPOGRAPHY.body,
  },
  datePlaceholder: {
    ...TYPOGRAPHY.body,
    color: COLORS.textTertiary,
  },
});

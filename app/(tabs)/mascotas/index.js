import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
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
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as api from '../../../services/api';
import AnimatedButton from '../../../components/AnimatedButton';
import AnimatedCard from '../../../components/AnimatedCard';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY, INPUT_STYLES, BUTTON_STYLES } from '../../../styles/theme';

export default function MascotaScreen() {
  const router = useRouter();
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
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingPets, setLoadingPets] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    requestImagePermission();
  }, []);

  // ✅ Refrescar mascotas cuando la pantalla recibe foco (después de editar)
  useFocusEffect(
    useCallback(() => {
      loadPets();
    }, [])
  );

  const requestImagePermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisos', 'Se necesitan permisos para acceder a la galería');
    }
  };

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
      const formData = new FormData();
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('photo', {
        uri,
        name: filename,
        type,
      });

      const response = await api.uploadPetPhoto(formData);
      console.log('Foto subida, URL recibida:', response.url);
      return response.url;
    } catch (error) {
      console.error('Error subiendo foto:', error);
      throw error;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    // Validaciones
    if (!formData.nombre.trim()) {
      Alert.alert('Error', 'Por favor, ingresa el nombre de tu mascota');
      return;
    }

    if (formData.peso && isNaN(parseFloat(formData.peso))) {
      Alert.alert('Error', 'El peso debe ser un número válido');
      return;
    }

    setLoading(true);
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

      console.log('Guardando mascota con datos:', { ...petData, photo: photoUrl ? 'URL presente' : 'Sin foto' });
      const savedPet = await api.createPet(petData);
      console.log('Mascota guardada, respuesta:', savedPet);
      Alert.alert('Éxito', 'Mascota guardada correctamente');
      
      // Limpiar formulario
      setFormData({
        nombre: '',
        tipo: 'Perro',
        raza: '',
        sexo: 'UNKNOWN',
        fechaNacimiento: '',
        peso: '',
        color: '',
        foto: null,
      });
      
      // Recargar mascotas
      await loadPets();
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo guardar la mascota');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePet = (petId, petName) => {
    Alert.alert(
      'Eliminar mascota',
      `¿Estás seguro de que quieres eliminar a ${petName}? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await api.deletePet(petId);
              Alert.alert('Éxito', 'Mascota eliminada correctamente');
              await loadPets();
            } catch (error) {
              Alert.alert('Error', error.message || 'No se pudo eliminar la mascota');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AnimatedCard style={styles.formContainer}>
        <Text style={styles.sectionTitle}>Agregar nueva mascota</Text>
        <Text style={styles.sectionSubtitle}>
          Cuéntanos sobre tu compañero para un mejor seguimiento
        </Text>

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
        <Text style={styles.label}>¿Cómo se llama tu mascota? *</Text>
        <TextInput
          style={styles.input}
          value={formData.nombre}
          onChangeText={(value) => handleChange('nombre', value)}
          placeholder="Ej: Max, Luna, Toby..."
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
          placeholderTextColor="#999"
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
                // Formatear como YYYY-MM-DD
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
          placeholderTextColor="#999"
        />

        {/* Color */}
        <Text style={styles.label}>Color</Text>
        <TextInput
          style={styles.input}
          value={formData.color}
          onChangeText={(value) => handleChange('color', value)}
          placeholder="Ej: Marrón, Blanco, etc."
          placeholderTextColor="#999"
        />

        {/* Botón Guardar */}
        <AnimatedButton
          style={[styles.saveButton, (loading || uploadingPhoto) && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={loading || uploadingPhoto}
        >
          {loading || uploadingPhoto ? (
            <ActivityIndicator color={COLORS.textWhite} />
          ) : (
            <Text style={styles.saveButtonText}>Guardar información</Text>
          )}
        </AnimatedButton>
      </AnimatedCard>

      {/* Lista de Mascotas */}
      <View style={styles.petsContainer}>
        <Text style={styles.petsTitle}>Tus mascotas</Text>
        {loadingPets ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B7FA8" />
          </View>
        ) : pets.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aún no has agregado mascotas</Text>
            <Text style={styles.emptySubtext}>
              Agrega tu primera mascota arriba para comenzar
            </Text>
          </View>
        ) : (
          pets.map((pet) => {
            return (
            <AnimatedCard key={pet.id} style={styles.petCard}>
              <View style={styles.petCardContent}>
                {pet.photo ? (
                  <Image 
                    source={{ uri: pet.photo }} 
                    style={styles.petPhoto}
                    onError={(error) => {
                      console.error('Error cargando imagen:', error.nativeEvent.error, 'URL:', pet.photo);
                    }}
                  />
                ) : (
                  <View style={[styles.petPhoto, { backgroundColor: COLORS.border, justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ fontSize: 28 }}>🐾</Text>
                  </View>
                )}
                <View style={styles.petInfo}>
                  <View style={styles.petHeader}>
                    <Text style={styles.petName}>{pet.name}</Text>
                    <Text style={styles.petSpecies}>{pet.type}</Text>
                  </View>
                  <View style={styles.petDetails}>
                    {pet.breed && (
                      <Text style={styles.petDetail}>Raza: {pet.breed}</Text>
                    )}
                    {pet.color && (
                      <Text style={styles.petDetail}>Color: {pet.color}</Text>
                    )}
                    {pet.weight && (
                      <Text style={styles.petDetail}>Peso: {pet.weight} kg</Text>
                    )}
                  </View>
                </View>
              </View>
              <View style={styles.petActions}>
                <AnimatedButton
                  style={styles.editPetButton}
                  onPress={() => router.push(`/mascotas/editar?id=${pet.id}`)}
                >
                  <Text style={styles.editPetButtonText}>Editar</Text>
                </AnimatedButton>
                <AnimatedButton
                  style={styles.deletePetButton}
                  onPress={() => handleDeletePet(pet.id, pet.name)}
                >
                  <Text style={styles.deletePetButtonText}>Eliminar</Text>
                </AnimatedButton>
              </View>
            </AnimatedCard>
            );
          })
        )}
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
    padding: SPACING.xl,
    paddingBottom: SPACING.xxxl + 80, // Espacio para el tabBar
  },
  formContainer: {
    marginBottom: SPACING.xxxl,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xxl,
    ...SHADOWS.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h4,
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
    lineHeight: 18,
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
  petsContainer: {
    marginTop: SPACING.xxxl,
  },
  petsTitle: {
    ...TYPOGRAPHY.h4,
    marginBottom: SPACING.lg,
  },
  loadingContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    ...TYPOGRAPHY.body,
    marginBottom: SPACING.xs,
  },
  emptySubtext: {
    textAlign: 'center',
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  petCard: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  petCardContent: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  petPhoto: {
    width: 72,
    height: 72,
    borderRadius: BORDER_RADIUS.md,
  },
  petInfo: {
    flex: 1,
  },
  petHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  petName: {
    ...TYPOGRAPHY.h4,
  },
  petSpecies: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primary,
  },
  petDetails: {
    gap: SPACING.xs,
  },
  petDetail: {
    ...TYPOGRAPHY.caption,
  },
  petActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  editPetButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  editPetButtonText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textWhite,
  },
  deletePetButton: {
    flex: 1,
    backgroundColor: COLORS.accentRed,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  deletePetButtonText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textWhite,
  },
  dateText: {
    ...TYPOGRAPHY.body,
  },
  datePlaceholder: {
    ...TYPOGRAPHY.body,
    color: COLORS.textTertiary,
  },
});

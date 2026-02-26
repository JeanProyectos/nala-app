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
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as api from '../../../services/api';

export default function MascotaScreen() {
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
    loadPets();
    requestImagePermission();
  }, []);

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.formContainer}>
        <Text style={styles.sectionTitle}>Registrar Nueva Mascota</Text>

        {/* Foto */}
        <View style={styles.photoSection}>
          <Text style={styles.label}>Foto de la Mascota</Text>
          {formData.foto ? (
            <View style={styles.photoPreview}>
              <Image source={{ uri: formData.foto }} style={styles.photoPreviewImage} />
              <TouchableOpacity
                style={styles.removePhotoButton}
                onPress={() => handleChange('foto', null)}
              >
                <Text style={styles.removePhotoText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoButtons}>
              <TouchableOpacity
                style={styles.photoButton}
                onPress={() => pickImage('camera')}
              >
                <Text style={styles.photoButtonText}>📷 Cámara</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.photoButton}
                onPress={() => pickImage('gallery')}
              >
                <Text style={styles.photoButtonText}>🖼️ Galería</Text>
              </TouchableOpacity>
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
          placeholderTextColor="#999"
        />

        {/* Tipo */}
        <Text style={styles.label}>Tipo *</Text>
        <View style={styles.pickerContainer}>
          {['Perro', 'Gato', 'Otro'].map((tipo) => (
            <TouchableOpacity
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
            </TouchableOpacity>
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
            <TouchableOpacity
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
            </TouchableOpacity>
          ))}
        </View>

        {/* Fecha de Nacimiento */}
        <Text style={styles.label}>Fecha de Nacimiento</Text>
        <TouchableOpacity
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
        </TouchableOpacity>
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
        <TouchableOpacity
          style={[styles.saveButton, (loading || uploadingPhoto) && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={loading || uploadingPhoto}
        >
          {loading || uploadingPhoto ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Guardar Mascota</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Lista de Mascotas */}
      <View style={styles.petsContainer}>
        <Text style={styles.petsTitle}>Mis Mascotas</Text>
        {loadingPets ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B7FA8" />
          </View>
        ) : pets.length === 0 ? (
          <Text style={styles.emptyText}>No tienes mascotas registradas</Text>
        ) : (
          pets.map((pet) => {
            // Debug: verificar que la foto esté presente
            console.log('Pet data:', { id: pet.id, name: pet.name, photo: pet.photo });
            return (
            <View key={pet.id} style={styles.petCard}>
              {pet.photo ? (
                <Image 
                  source={{ uri: pet.photo }} 
                  style={styles.petPhoto}
                  onError={(error) => {
                    console.error('Error cargando imagen:', error.nativeEvent.error, 'URL:', pet.photo);
                  }}
                  onLoad={() => {
                    console.log('Imagen cargada correctamente:', pet.photo);
                  }}
                />
              ) : (
                <View style={[styles.petPhoto, { backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={{ fontSize: 24 }}>🐾</Text>
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
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 20,
  },
  formContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
  },
  photoSection: {
    marginBottom: 20,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  photoButtonText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  photoPreview: {
    position: 'relative',
    width: 150,
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  photoPreviewImage: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
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
    gap: 12,
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
  buttonDisabled: {
    opacity: 0.6,
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
    flexDirection: 'row',
    gap: 12,
  },
  petPhoto: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  petInfo: {
    flex: 1,
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
    gap: 4,
  },
  petDetail: {
    fontSize: 14,
    color: '#666',
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

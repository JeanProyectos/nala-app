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
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as api from '../services/api';
import AnimatedButton from '../components/AnimatedButton';
import AnimatedCard from '../components/AnimatedCard';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY, INPUT_STYLES, BUTTON_STYLES } from '../styles/theme';

const PROFILE_PHOTO_KEY = 'user_profile_photo';

export default function EditarPerfilUsuarioScreen() {
  const router = useRouter();
  const { user, checkAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    photo: null,
  });

  useEffect(() => {
    loadProfileData();
  }, [user]);

  const loadProfileData = async () => {
    if (user) {
      // Usar la foto del usuario del servidor directamente
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        photo: user.photo || null,
      });
    }
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
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
        setSavingPhoto(true);
        try {
          // Subir la foto directamente al servidor
          const formDataUpload = new FormData();
          formDataUpload.append('photo', {
            uri: result.assets[0].uri,
            type: 'image/jpeg',
            name: `profile_${user?.id || 'user'}_${Date.now()}.jpg`,
          });

          const uploadResponse = await api.uploadUserPhoto(formDataUpload);
          
          // Actualizar el estado con la URL del servidor
          setFormData({
            ...formData,
            photo: uploadResponse.url,
          });

          Alert.alert('Éxito', 'Foto actualizada correctamente');
        } catch (error) {
          console.error('Error subiendo foto:', error);
          Alert.alert('Error', error.message || 'No se pudo subir la foto');
        } finally {
          setSavingPhoto(false);
        }
      }
    } catch (error) {
      console.error('Error seleccionando imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const removePhoto = async () => {
    Alert.alert(
      'Eliminar foto',
      '¿Estás seguro de que quieres eliminar tu foto de perfil?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              // Actualizar perfil sin foto
              await api.updateProfile({ photo: null });
              setFormData({
                ...formData,
                photo: null,
              });
              await checkAuth();
              Alert.alert('Éxito', 'Foto eliminada');
            } catch (error) {
              console.error('Error eliminando foto:', error);
              Alert.alert('Error', 'No se pudo eliminar la foto');
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }

    if (!formData.email.trim()) {
      Alert.alert('Error', 'El email es requerido');
      return;
    }

    setLoading(true);
    try {
      // Actualizar perfil con todos los datos incluyendo la foto (ya está subida)
      const profileData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        photo: formData.photo || undefined,
      };

      await api.updateProfile(profileData);

      await checkAuth(); // Recargar datos del usuario
      Alert.alert('Éxito', 'Perfil actualizado correctamente', [
        { 
          text: 'OK', 
          onPress: () => {
            // Intentar volver atrás, si no hay historial, ir al perfil
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/perfil');
            }
          }
        }
      ]);
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      Alert.alert('Error', error.message || 'No se pudo actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AnimatedCard style={styles.formCard}>
        <Text style={styles.title}>Editar perfil</Text>
        <Text style={styles.subtitle}>
          Actualiza tu información personal
        </Text>

        {/* Foto de Perfil */}
        <View style={styles.photoSection}>
          <Text style={styles.label}>Foto de perfil</Text>
          {formData.photo ? (
            <View style={styles.photoPreview}>
              <Image source={{ uri: formData.photo }} style={styles.photoPreviewImage} />
              <AnimatedButton
                style={styles.removePhotoButton}
                onPress={removePhoto}
              >
                <Text style={styles.removePhotoText}>✕</Text>
              </AnimatedButton>
            </View>
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderText}>
                {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          <AnimatedButton
            style={styles.photoButton}
            onPress={pickImage}
            disabled={savingPhoto}
          >
            {savingPhoto ? (
              <ActivityIndicator color={COLORS.primary} size="small" />
            ) : (
              <Text style={styles.photoButtonText}>
                {formData.photo ? 'Cambiar foto' : 'Agregar foto'}
              </Text>
            )}
          </AnimatedButton>
        </View>

        {/* Nombre */}
        <Text style={styles.label}>Nombre *</Text>
        <TextInput
          style={styles.input}
          value={formData.name}
          onChangeText={(value) => handleChange('name', value)}
          placeholder="Tu nombre completo"
          placeholderTextColor={COLORS.textTertiary}
        />

        {/* Email */}
        <Text style={styles.label}>Email *</Text>
        <TextInput
          style={styles.input}
          value={formData.email}
          onChangeText={(value) => handleChange('email', value)}
          placeholder="tu@email.com"
          placeholderTextColor={COLORS.textTertiary}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        {/* Teléfono */}
        <Text style={styles.label}>Teléfono</Text>
        <TextInput
          style={styles.input}
          value={formData.phone}
          onChangeText={(value) => handleChange('phone', value)}
          placeholder="Opcional"
          placeholderTextColor={COLORS.textTertiary}
          keyboardType="phone-pad"
        />

        {/* Botón Guardar */}
        <AnimatedButton
          style={[styles.saveButton, loading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
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
  formCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xxl,
    ...SHADOWS.lg,
  },
  title: {
    ...TYPOGRAPHY.h3,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  photoPreview: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: BORDER_RADIUS.round,
    overflow: 'hidden',
    marginBottom: SPACING.md,
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
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoText: {
    color: COLORS.textWhite,
    fontSize: 18,
    fontWeight: 'bold',
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  photoPlaceholderText: {
    ...TYPOGRAPHY.h1,
    color: COLORS.textWhite,
  },
  photoButton: {
    backgroundColor: COLORS.backgroundTertiary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  photoButtonText: {
    ...TYPOGRAPHY.body,
    fontWeight: '500',
  },
  label: {
    ...TYPOGRAPHY.bodyBold,
    marginBottom: SPACING.sm,
    marginTop: SPACING.lg,
  },
  input: {
    ...INPUT_STYLES.default,
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
});

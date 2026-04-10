import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import * as api from '../../../services/api';
import AnimatedButton from '../../../components/AnimatedButton';
import AnimatedCard from '../../../components/AnimatedCard';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY, INPUT_STYLES, BUTTON_STYLES } from '../../../styles/theme';

const POST_TYPES = [
  { value: 'CLINICAL_CASE', label: '🏥 Caso Clínico' },
  { value: 'FORUM_DISCUSSION', label: '💬 Discusión' },
  { value: 'ARTICLE', label: '📄 Artículo' },
];

const VISIBILITY_OPTIONS = [
  { value: 'PUBLIC', label: '🌐 Público' },
  { value: 'VETS_ONLY', label: '👨‍⚕️ Solo Veterinarios' },
];

const SPECIES_OPTIONS = [
  { value: 'DOG', label: 'Perro' },
  { value: 'CAT', label: 'Gato' },
  { value: 'BIRD', label: 'Ave' },
  { value: 'RODENT', label: 'Roedor' },
  { value: 'REPTILE', label: 'Reptil' },
  { value: 'OTHER', label: 'Otro' },
];

export default function CreatePostScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'FORUM_DISCUSSION',
    title: '',
    visibility: 'PUBLIC',
    tags: '',
    // Clinical Case
    declaresNoPersonalData: false,
    species: 'DOG',
    age: '',
    weight: '',
    symptoms: '',
    diagnosis: '',
    treatment: '',
    evolution: '',
    // Forum Discussion
    description: '',
    // Article
    content: '',
  });

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async () => {
    // Validaciones básicas
    if (!formData.title.trim()) {
      Alert.alert('Error', 'El título es requerido');
      return;
    }

    if (formData.type === 'CLINICAL_CASE') {
      if (!formData.symptoms.trim() || !formData.diagnosis.trim() || !formData.treatment.trim()) {
        Alert.alert('Error', 'Los campos de síntomas, diagnóstico y tratamiento son requeridos para casos clínicos');
        return;
      }
      if (!formData.declaresNoPersonalData) {
        Alert.alert('Confirmación requerida', 'Debes confirmar que no incluyes datos personales del propietario');
        return;
      }
    }

    if (formData.type === 'FORUM_DISCUSSION' && !formData.description.trim()) {
      Alert.alert('Error', 'La descripción es requerida para discusiones');
      return;
    }

    if (formData.type === 'ARTICLE' && !formData.content.trim()) {
      Alert.alert('Error', 'El contenido es requerido para artículos');
      return;
    }

    setLoading(true);
    try {
      const postData = {
        type: formData.type,
        title: formData.title.trim(),
        visibility: formData.visibility,
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t.length > 0),
      };

      if (formData.type === 'CLINICAL_CASE') {
        postData.declaresNoPersonalData = formData.declaresNoPersonalData;
        postData.species = formData.species;
        if (formData.age) postData.age = formData.age.trim();
        if (formData.weight) postData.weight = parseFloat(formData.weight);
        postData.symptoms = formData.symptoms.trim();
        postData.diagnosis = formData.diagnosis.trim();
        postData.treatment = formData.treatment.trim();
        if (formData.evolution) postData.evolution = formData.evolution.trim();
      }

      if (formData.type === 'FORUM_DISCUSSION') {
        postData.description = formData.description.trim();
      }

      if (formData.type === 'ARTICLE') {
        postData.content = formData.content.trim();
      }

      await api.createCommunityPost(postData);
      Alert.alert('Éxito', 'Post creado correctamente', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error creando post:', error);
      Alert.alert('Error', error.message || 'No se pudo crear el post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Crear Post</Text>
      </View>

      <AnimatedCard style={styles.formCard}>
        {/* Tipo de Post */}
        <Text style={styles.label}>Tipo de Post *</Text>
        <View style={styles.optionsContainer}>
          {POST_TYPES.map((type) => (
            <AnimatedButton
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
            </AnimatedButton>
          ))}
        </View>

        {/* Visibilidad */}
        <Text style={styles.label}>Visibilidad *</Text>
        <View style={styles.optionsContainer}>
          {VISIBILITY_OPTIONS.map((vis) => (
            <AnimatedButton
              key={vis.value}
              style={[
                styles.optionButton,
                formData.visibility === vis.value && styles.optionButtonActive,
              ]}
              onPress={() => handleChange('visibility', vis.value)}
            >
              <Text
                style={[
                  styles.optionText,
                  formData.visibility === vis.value && styles.optionTextActive,
                ]}
              >
                {vis.label}
              </Text>
            </AnimatedButton>
          ))}
        </View>

        {/* Título */}
        <Text style={styles.label}>Título *</Text>
        <TextInput
          style={styles.input}
          value={formData.title}
          onChangeText={(value) => handleChange('title', value)}
          placeholder="Título del post"
          placeholderTextColor={COLORS.textTertiary}
          multiline
        />

        {/* Tags */}
        <Text style={styles.label}>Tags (separados por comas)</Text>
        <TextInput
          style={styles.input}
          value={formData.tags}
          onChangeText={(value) => handleChange('tags', value)}
          placeholder="ej: medicina, emergencias, gatos"
          placeholderTextColor={COLORS.textTertiary}
        />

        {/* Campos específicos para Caso Clínico */}
        {formData.type === 'CLINICAL_CASE' && (
          <>
            <Text style={styles.label}>Especie *</Text>
            <View style={styles.optionsContainer}>
              {SPECIES_OPTIONS.map((spec) => (
                <AnimatedButton
                  key={spec.value}
                  style={[
                    styles.optionButtonSmall,
                    formData.species === spec.value && styles.optionButtonActive,
                  ]}
                  onPress={() => handleChange('species', spec.value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      formData.species === spec.value && styles.optionTextActive,
                    ]}
                  >
                    {spec.label}
                  </Text>
                </AnimatedButton>
              ))}
            </View>

            <Text style={styles.label}>Edad</Text>
            <TextInput
              style={styles.input}
              value={formData.age}
              onChangeText={(value) => handleChange('age', value)}
              placeholder="Ej: 2 años"
              placeholderTextColor={COLORS.textTertiary}
            />

            <Text style={styles.label}>Peso (kg)</Text>
            <TextInput
              style={styles.input}
              value={formData.weight}
              onChangeText={(value) => handleChange('weight', value)}
              placeholder="Ej: 15.5"
              keyboardType="numeric"
              placeholderTextColor={COLORS.textTertiary}
            />

            <Text style={styles.label}>Síntomas *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.symptoms}
              onChangeText={(value) => handleChange('symptoms', value)}
              placeholder="Describe los síntomas observados"
              placeholderTextColor={COLORS.textTertiary}
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>Diagnóstico *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.diagnosis}
              onChangeText={(value) => handleChange('diagnosis', value)}
              placeholder="Diagnóstico realizado"
              placeholderTextColor={COLORS.textTertiary}
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>Tratamiento *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.treatment}
              onChangeText={(value) => handleChange('treatment', value)}
              placeholder="Tratamiento aplicado"
              placeholderTextColor={COLORS.textTertiary}
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>Evolución</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.evolution}
              onChangeText={(value) => handleChange('evolution', value)}
              placeholder="Evolución del caso"
              placeholderTextColor={COLORS.textTertiary}
              multiline
              numberOfLines={4}
            />

            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>
                Confirmo que no incluyo datos personales del propietario *
              </Text>
              <Switch
                value={formData.declaresNoPersonalData}
                onValueChange={(value) => handleChange('declaresNoPersonalData', value)}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor={COLORS.textWhite}
              />
            </View>
          </>
        )}

        {/* Campos específicos para Discusión */}
        {formData.type === 'FORUM_DISCUSSION' && (
          <>
            <Text style={styles.label}>Descripción *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(value) => handleChange('description', value)}
              placeholder="Describe tu pregunta o tema de discusión"
              placeholderTextColor={COLORS.textTertiary}
              multiline
              numberOfLines={6}
            />
          </>
        )}

        {/* Campos específicos para Artículo */}
        {formData.type === 'ARTICLE' && (
          <>
            <Text style={styles.label}>Contenido *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.content}
              onChangeText={(value) => handleChange('content', value)}
              placeholder="Escribe el contenido del artículo"
              placeholderTextColor={COLORS.textTertiary}
              multiline
              numberOfLines={10}
            />
          </>
        )}

        {/* Botón Guardar */}
        <AnimatedButton
          style={[styles.submitButton, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.textWhite} />
          ) : (
            <Text style={styles.submitButtonText}>Publicar Post</Text>
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
  header: {
    marginBottom: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
  },
  formCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xxl,
    ...SHADOWS.lg,
  },
  label: {
    ...TYPOGRAPHY.bodyBold,
    marginBottom: SPACING.sm,
    marginTop: SPACING.lg,
  },
  input: {
    ...INPUT_STYLES.default,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  optionButton: {
    flex: 1,
    minWidth: '45%',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.backgroundTertiary,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  optionButtonSmall: {
    flex: 1,
    minWidth: '30%',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.backgroundTertiary,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
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
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: BORDER_RADIUS.md,
  },
  switchLabel: {
    ...TYPOGRAPHY.caption,
    flex: 1,
    marginRight: SPACING.sm,
  },
  submitButton: {
    ...BUTTON_STYLES.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xxl,
  },
  submitButtonText: {
    ...TYPOGRAPHY.button,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

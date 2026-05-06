import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as api from '../services/api';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY, INPUT_STYLES } from '../styles/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Correo', 'Ingresa tu email registrado');
      return;
    }
    setLoading(true);
    try {
      await api.requestPasswordReset(email.trim());
      Alert.alert(
        'Revisa tu correo',
        'Si el email está en NALA, te enviamos un código de 6 dígitos (válido 10 minutos).',
        [
          {
            text: 'Continuar',
            onPress: () =>
              router.push({
                pathname: '/reset-password',
                params: { email: email.trim() },
              }),
          },
        ],
      );
    } catch (e) {
      Alert.alert('Error', e.message || 'No se pudo procesar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← Volver</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Recuperar contraseña</Text>
      <Text style={styles.subtitle}>
        Ingresa el correo con el que te registraste. Te enviaremos un código.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={COLORS.textTertiary}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={onSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Enviar código</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundSecondary },
  content: { padding: SPACING.xl, paddingTop: 48 },
  back: { marginBottom: SPACING.lg },
  backText: { ...TYPOGRAPHY.body, color: COLORS.primary },
  title: { ...TYPOGRAPHY.h2, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  subtitle: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, marginBottom: SPACING.xl },
  input: { ...INPUT_STYLES.default, marginBottom: SPACING.lg },
  button: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { ...TYPOGRAPHY.button, color: COLORS.textWhite },
});

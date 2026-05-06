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
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as api from '../services/api';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY, INPUT_STYLES } from '../styles/theme';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const initialEmail = (Array.isArray(params.email) ? params.email[0] : params.email) || '';

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  const onVerifyCode = async () => {
    if (code.length !== 6) {
      Alert.alert('Código', 'El código tiene 6 dígitos');
      return;
    }
    setLoading(true);
    try {
      await api.verifyPasswordResetCode(email.trim(), code.trim());
      setVerified(true);
      Alert.alert('Código correcto', 'Ahora elige tu nueva contraseña.');
    } catch (e) {
      Alert.alert('Error', e.message || 'Código inválido o expirado');
    } finally {
      setLoading(false);
    }
  };

  const onReset = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Contraseña', 'Mínimo 6 caracteres');
      return;
    }
    if (newPassword !== confirm) {
      Alert.alert('Contraseña', 'Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    try {
      await api.resetPasswordWithCode(email.trim(), code.trim(), newPassword);
      Alert.alert('Listo', 'Tu contraseña fue actualizada. Inicia sesión.', [
        { text: 'OK', onPress: () => router.replace('/login') },
      ]);
    } catch (e) {
      Alert.alert('Error', e.message || 'No se pudo cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← Volver</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Nueva contraseña</Text>
      <Text style={styles.subtitle}>
        Paso 1: confirma el código del correo. Paso 2: define tu nueva contraseña.
      </Text>

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholderTextColor={COLORS.textTertiary}
      />

      <Text style={styles.label}>Código (6 dígitos)</Text>
      <TextInput
        style={styles.input}
        value={code}
        onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="000000"
        placeholderTextColor={COLORS.textTertiary}
      />

      {!verified ? (
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={onVerifyCode}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Validar código</Text>}
        </TouchableOpacity>
      ) : (
        <>
          <Text style={styles.label}>Nueva contraseña</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholder="Mínimo 6 caracteres"
            placeholderTextColor={COLORS.textTertiary}
          />
          <Text style={styles.label}>Confirmar</Text>
          <TextInput
            style={styles.input}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            placeholderTextColor={COLORS.textTertiary}
          />
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={onReset}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Guardar contraseña</Text>}
          </TouchableOpacity>
        </>
      )}
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
  label: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  input: { ...INPUT_STYLES.default, marginBottom: SPACING.md },
  button: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    marginTop: SPACING.md,
    ...SHADOWS.sm,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { ...TYPOGRAPHY.button, color: COLORS.textWhite },
});

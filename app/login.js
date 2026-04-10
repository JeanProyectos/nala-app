import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';
import AnimatedButton from '../components/AnimatedButton';
import AnimatedCard from '../components/AnimatedCard';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY, INPUT_STYLES, BUTTON_STYLES } from '../styles/theme';

export default function LoginScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isVeterinarian, setIsVeterinarian] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const router = useRouter();

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim() || (!isLogin && !name.trim())) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const result = await signIn(email, password);
        if (!result.success) {
          Alert.alert('Error', result.error || 'Ocurrió un error');
        }
      } else {
        // Registrar como veterinario si está marcado
        const result = await signUp(name, email, password, isVeterinarian);
        if (result.success) {
          // Si es veterinario, redirigir a completar perfil
          if (result.isVeterinarian) {
            setTimeout(() => {
              router.push('/veterinario-registro');
            }, 1000);
          }
        } else {
          Alert.alert('Error', result.error || 'Ocurrió un error');
        }
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Ocurrió un error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>🐾 NALA</Text>
        <Text style={styles.subtitle}>
          {isLogin 
            ? 'Bienvenido de vuelta' 
            : 'Comienza a cuidar mejor a tu mascota'}
        </Text>
      </View>

      <AnimatedCard style={styles.formCard}>
        <View style={styles.form}>
          {!isLogin && (
            <>
              <Text style={styles.label}>Nombre</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Tu nombre"
                placeholderTextColor={COLORS.textTertiary}
              />
            </>
          )}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="tu@email.com"
            placeholderTextColor={COLORS.textTertiary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Al menos 6 caracteres"
            placeholderTextColor={COLORS.textTertiary}
            secureTextEntry
            autoCapitalize="none"
          />

          {!isLogin && (
            <AnimatedButton
              style={styles.checkboxContainer}
              onPress={() => setIsVeterinarian(!isVeterinarian)}
            >
              <View style={[styles.checkbox, isVeterinarian && styles.checkboxChecked]}>
                {isVeterinarian && <Text style={styles.checkboxCheckmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>👨‍⚕️ Soy veterinario</Text>
            </AnimatedButton>
          )}

          <AnimatedButton
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.textWhite} />
            ) : (
              <Text style={styles.buttonText}>
                {isLogin ? 'Iniciar sesión' : 'Registrarse'}
              </Text>
            )}
          </AnimatedButton>

          <AnimatedButton
            style={styles.switchButton}
            onPress={() => setIsLogin(!isLogin)}
            disabled={loading}
          >
            <Text style={styles.switchText}>
              {isLogin
                ? '¿Primera vez? Crea tu cuenta'
                : '¿Ya tienes cuenta? Inicia sesión'}
            </Text>
          </AnimatedButton>
        </View>
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
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xxxl,
    paddingTop: SPACING.xxxl,
  },
  title: {
    ...TYPOGRAPHY.h1,
    fontSize: 48,
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    fontSize: 18,
    color: COLORS.textSecondary,
  },
  formCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xxl,
    ...SHADOWS.lg,
  },
  form: {
    width: '100%',
  },
  label: {
    ...TYPOGRAPHY.bodyBold,
    marginBottom: SPACING.sm,
    marginTop: SPACING.lg,
  },
  input: {
    ...INPUT_STYLES.default,
  },
  button: {
    ...BUTTON_STYLES.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xxl,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...TYPOGRAPHY.button,
  },
  switchButton: {
    marginTop: SPACING.xl,
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  switchText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primary,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginRight: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxCheckmark: {
    color: COLORS.textWhite,
    fontSize: 18,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    ...TYPOGRAPHY.body,
    fontWeight: '500',
  },
});


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
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as api from '../../services/api';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../../styles/theme';
import AnimatedButton from '../../components/AnimatedButton';
import AnimatedCard from '../../components/AnimatedCard';

export default function ConfigurarPagosScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [veterinarianProfile, setVeterinarianProfile] = useState(null);
  
  const [formData, setFormData] = useState({
    email: '',
    legalName: '',
    contactName: '',
    phoneNumber: '',
    legalId: '',
    accountType: 'COLLECTION',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const profile = await api.getMyVeterinarianProfile();
      setVeterinarianProfile(profile);
      
      // Prellenar formulario con datos del usuario
      const userProfile = await api.getProfile();
      setFormData({
        email: userProfile?.email || '',
        legalName: profile?.fullName || '',
        contactName: profile?.fullName || '',
        phoneNumber: userProfile?.phone || '',
        legalId: '',
        accountType: 'COLLECTION',
      });
    } catch (error) {
      console.error('Error cargando perfil:', error);
      Alert.alert('Error', 'No se pudo cargar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Validaciones
    if (!formData.email || !formData.legalName || !formData.contactName || 
        !formData.phoneNumber || !formData.legalId) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Error', 'Por favor ingresa un email válido');
      return;
    }

    // Validar teléfono (debe tener al menos 10 dígitos)
    const phoneRegex = /^[0-9+\-\s()]{10,}$/;
    if (!phoneRegex.test(formData.phoneNumber.replace(/\s/g, ''))) {
      Alert.alert('Error', 'Por favor ingresa un teléfono válido (mínimo 10 dígitos)');
      return;
    }

    // Validar documento (debe tener al menos 7 dígitos)
    if (formData.legalId.length < 7) {
      Alert.alert('Error', 'Por favor ingresa un documento válido (mínimo 7 dígitos)');
      return;
    }

    try {
      setSaving(true);
      
      Alert.alert(
        'Confirmar Configuración',
        'Al configurar tus datos bancarios, aceptas que Wompi procesará tus pagos. ¿Deseas continuar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Confirmar',
            onPress: async () => {
              try {
                await api.onboardVeterinarian(formData);
                Alert.alert(
                  '✅ Configuración Exitosa',
                  'Tus datos bancarios han sido configurados. Wompi revisará tu información y te notificará cuando esté lista.',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        router.back();
                      },
                    },
                  ]
                );
              } catch (error) {
                const errorMessage = error.message || 'No se pudo configurar los datos bancarios';
                Alert.alert('Error', errorMessage);
              } finally {
                setSaving(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo guardar la configuración');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  const isConfigured = veterinarianProfile?.wompiSubaccountId;
  const accountStatus = veterinarianProfile?.wompiAccountStatus;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Configurar Pagos</Text>
          <View style={styles.backButton} />
        </View>

        <AnimatedCard style={styles.infoCard}>
          <Text style={styles.infoTitle}>💳 Información de Pago</Text>
          <Text style={styles.infoText}>
            Para recibir pagos de las consultas, necesitas configurar una cuenta en Wompi Marketplace.
            Los pagos se dividirán automáticamente entre tú y la plataforma según la comisión configurada.
          </Text>
        </AnimatedCard>

        {isConfigured && (
          <AnimatedCard style={styles.statusCard}>
            <Text style={styles.statusTitle}>Estado de tu Cuenta</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>
                {accountStatus === 'PENDING' && '⏳ Pendiente de Verificación'}
                {accountStatus === 'APPROVED' && '✅ Cuenta Aprobada'}
                {accountStatus === 'REJECTED' && '❌ Cuenta Rechazada'}
              </Text>
            </View>
            <Text style={styles.statusSubtext}>
              ID de Subcuenta: {veterinarianProfile.wompiSubaccountId}
            </Text>
            {accountStatus === 'PENDING' && (
              <Text style={styles.statusNote}>
                Wompi está revisando tu información. Te notificaremos cuando tu cuenta esté lista.
              </Text>
            )}
            {accountStatus === 'REJECTED' && (
              <Text style={styles.statusNote}>
                Tu cuenta fue rechazada. Por favor verifica tus datos y vuelve a intentar.
              </Text>
            )}
          </AnimatedCard>
        )}

        <AnimatedCard style={styles.formCard}>
          <Text style={styles.formTitle}>Datos Bancarios</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              placeholder="tu@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isConfigured}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nombre Legal / Razón Social *</Text>
            <TextInput
              style={styles.input}
              value={formData.legalName}
              onChangeText={(text) => setFormData({ ...formData, legalName: text })}
              placeholder="Dr. Juan Pérez o Empresa S.A.S."
              editable={!isConfigured}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nombre de Contacto *</Text>
            <TextInput
              style={styles.input}
              value={formData.contactName}
              onChangeText={(text) => setFormData({ ...formData, contactName: text })}
              placeholder="Juan Pérez"
              editable={!isConfigured}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Teléfono *</Text>
            <TextInput
              style={styles.input}
              value={formData.phoneNumber}
              onChangeText={(text) => setFormData({ ...formData, phoneNumber: text })}
              placeholder="+57 300 123 4567"
              keyboardType="phone-pad"
              editable={!isConfigured}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Cédula o NIT *</Text>
            <TextInput
              style={styles.input}
              value={formData.legalId}
              onChangeText={(text) => setFormData({ ...formData, legalId: text.replace(/\D/g, '') })}
              placeholder="1234567890"
              keyboardType="numeric"
              editable={!isConfigured}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tipo de Cuenta</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={[
                  styles.radioButton,
                  formData.accountType === 'COLLECTION' && styles.radioButtonActive,
                ]}
                onPress={() => setFormData({ ...formData, accountType: 'COLLECTION' })}
                disabled={isConfigured}
              >
                <Text
                  style={[
                    styles.radioText,
                    formData.accountType === 'COLLECTION' && styles.radioTextActive,
                  ]}
                >
                  Recaudo (COLLECTION)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.radioButton,
                  formData.accountType === 'DISPERSION' && styles.radioButtonActive,
                ]}
                onPress={() => setFormData({ ...formData, accountType: 'DISPERSION' })}
                disabled={isConfigured}
              >
                <Text
                  style={[
                    styles.radioText,
                    formData.accountType === 'DISPERSION' && styles.radioTextActive,
                  ]}
                >
                  Dispersión (DISPERSION)
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {!isConfigured && (
            <AnimatedButton
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={COLORS.textWhite} />
              ) : (
                <Text style={styles.submitButtonText}>Configurar Cuenta</Text>
              )}
            </AnimatedButton>
          )}
        </AnimatedCard>

        <AnimatedCard style={styles.helpCard}>
          <Text style={styles.helpTitle}>ℹ️ Información Importante</Text>
          <Text style={styles.helpText}>
            • Los pagos se procesan automáticamente a través de Wompi{'\n'}
            • La comisión de la plataforma se calcula según la configuración del administrador{'\n'}
            • Recibirás el dinero directamente en tu cuenta bancaria configurada en Wompi{'\n'}
            • Los pagos pueden tardar 1-3 días hábiles en reflejarse{'\n'}
            • Si tienes problemas, contacta al soporte de Wompi
          </Text>
        </AnimatedCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
  },
  loadingText: {
    marginTop: SPACING.md,
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },
  backButton: {
    fontSize: 24,
    color: COLORS.primary,
    width: 40,
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
    flex: 1,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  infoTitle: {
    ...TYPOGRAPHY.h4,
    marginBottom: SPACING.sm,
  },
  infoText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  statusCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  statusTitle: {
    ...TYPOGRAPHY.h4,
    marginBottom: SPACING.md,
  },
  statusBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignSelf: 'flex-start',
    marginBottom: SPACING.sm,
  },
  statusText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textWhite,
  },
  statusSubtext: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  statusNote: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  formCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  formTitle: {
    ...TYPOGRAPHY.h4,
    marginBottom: SPACING.lg,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  label: {
    ...TYPOGRAPHY.captionBold,
    marginBottom: SPACING.xs,
    color: COLORS.textSecondary,
  },
  input: {
    ...TYPOGRAPHY.body,
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  radioButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundTertiary,
    alignItems: 'center',
  },
  radioButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  radioText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  radioTextActive: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.primary,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.md,
    ...SHADOWS.md,
  },
  submitButtonText: {
    ...TYPOGRAPHY.button,
  },
  helpCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accentYellow,
    ...SHADOWS.sm,
  },
  helpTitle: {
    ...TYPOGRAPHY.h4,
    marginBottom: SPACING.sm,
  },
  helpText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});

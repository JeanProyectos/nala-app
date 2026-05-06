import { useEffect, useState } from 'react';
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
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as api from '../../services/api';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../../styles/theme';
import AnimatedButton from '../../components/AnimatedButton';
import AnimatedCard from '../../components/AnimatedCard';

const METHOD_TYPES = {
  BANK_ACCOUNT: 'Cuenta bancaria',
  MOBILE_WALLET: 'Billetera movil',
};

const INITIAL_FORM = {
  type: 'BANK_ACCOUNT',
  label: '',
  bank: '',
  accountType: '',
  accountNumber: '',
  walletProvider: '',
  walletNumber: '',
  accountHolderName: '',
  active: true,
};

export default function ConfigurarPagosScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingMethodId, setEditingMethodId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [methods, setMethods] = useState([]);
  const [veterinarianProfile, setVeterinarianProfile] = useState(null);
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [profile, paymentMethods, settlementDashboard] = await Promise.all([
        api.getMyVeterinarianProfile(),
        api.getVeterinarianPaymentMethods(),
        api.getVeterinarianSettlementDashboard(),
      ]);

      setVeterinarianProfile(profile);
      setMethods(Array.isArray(paymentMethods) ? paymentMethods : []);
      setDashboard(settlementDashboard);
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo cargar la configuracion de pagos');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingMethodId(null);
    setFormData(INITIAL_FORM);
  };

  const fillForm = (method) => {
    const details = method?.details || {};
    setEditingMethodId(method.id);
    setFormData({
      type: method.type,
      label: method.label || '',
      bank: details.bank || '',
      accountType: details.accountType || '',
      accountNumber: details.accountNumber || '',
      walletProvider: details.walletProvider || '',
      walletNumber: details.walletNumber || '',
      accountHolderName: details.accountHolderName || '',
      active: !!method.active,
    });
  };

  const validateForm = () => {
    if (!formData.accountHolderName.trim()) {
      return 'Ingresa el nombre del titular';
    }

    if (formData.type === 'BANK_ACCOUNT') {
      if (!formData.bank.trim() || !formData.accountType.trim() || !formData.accountNumber.trim()) {
        return 'Completa banco, tipo y numero de cuenta';
      }
    } else if (!formData.walletProvider.trim() || !formData.walletNumber.trim()) {
      return 'Completa proveedor y numero de billetera';
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert('Error', validationError);
      return;
    }

    try {
      setSaving(true);
      const payload = {
        type: formData.type,
        label: formData.label.trim() || undefined,
        bank: formData.type === 'BANK_ACCOUNT' ? formData.bank.trim() : undefined,
        accountType:
          formData.type === 'BANK_ACCOUNT' ? formData.accountType.trim() : undefined,
        accountNumber:
          formData.type === 'BANK_ACCOUNT' ? formData.accountNumber.trim() : undefined,
        walletProvider:
          formData.type === 'MOBILE_WALLET' ? formData.walletProvider.trim() : undefined,
        walletNumber:
          formData.type === 'MOBILE_WALLET' ? formData.walletNumber.trim() : undefined,
        accountHolderName: formData.accountHolderName.trim(),
        active: formData.active,
      };

      if (editingMethodId) {
        await api.updateVeterinarianPaymentMethod(editingMethodId, payload);
      } else {
        await api.createVeterinarianPaymentMethod(payload);
      }

      Alert.alert(
        'Exito',
        editingMethodId
          ? 'Metodo de pago actualizado correctamente.'
          : 'Metodo de pago agregado correctamente.',
      );
      resetForm();
      await loadData();
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo guardar el metodo de pago');
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (methodId) => {
    try {
      await api.activateVeterinarianPaymentMethod(methodId);
      await loadData();
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo activar el metodo');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando configuracion...</Text>
      </View>
    );
  }

  const activeMethod = methods.find((method) => method.active);
  const commissionText =
    dashboard?.summary?.commissionText ||
    'La aplicacion cobra una comision por cada consulta realizada.';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Configurar pagos</Text>
          <View style={styles.backButton} />
        </View>

        <AnimatedCard style={styles.infoCard}>
          <Text style={styles.infoTitle}>Liquidacion al veterinario</Text>
          <Text style={styles.infoText}>{commissionText}</Text>
        </AnimatedCard>

        {veterinarianProfile?.wompiSubaccountId && (
          <AnimatedCard style={styles.marketplaceCard}>
            <Text style={styles.sectionTitle}>Cuenta marketplace</Text>
            <Text style={styles.marketplaceText}>
              ID configurado: {veterinarianProfile.wompiSubaccountId}
            </Text>
            <Text style={styles.marketplaceText}>
              Estado: {veterinarianProfile.wompiAccountStatus || 'PENDING'}
            </Text>
          </AnimatedCard>
        )}

        <AnimatedCard style={styles.activeCard}>
          <Text style={styles.sectionTitle}>Metodo activo</Text>
          {activeMethod ? (
            <>
              <Text style={styles.methodTitle}>{activeMethod.label}</Text>
              <Text style={styles.methodSubtitle}>
                {METHOD_TYPES[activeMethod.type] || activeMethod.type}
              </Text>
            </>
          ) : (
            <Text style={styles.infoText}>Todavia no tienes un metodo activo.</Text>
          )}
        </AnimatedCard>

        <AnimatedCard style={styles.formCard}>
          <Text style={styles.sectionTitle}>
            {editingMethodId ? 'Editar metodo de pago' : 'Agregar metodo de pago'}
          </Text>

          <View style={styles.typeRow}>
            {Object.entries(METHOD_TYPES).map(([value, label]) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.typeButton,
                  formData.type === value && styles.typeButtonActive,
                ]}
                onPress={() =>
                  setFormData((current) => ({
                    ...current,
                    type: value,
                  }))
                }
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    formData.type === value && styles.typeButtonTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Etiqueta (opcional)</Text>
            <TextInput
              style={styles.input}
              value={formData.label}
              onChangeText={(text) => setFormData((current) => ({ ...current, label: text }))}
              placeholder="Ej: Cuenta principal"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nombre del titular *</Text>
            <TextInput
              style={styles.input}
              value={formData.accountHolderName}
              onChangeText={(text) =>
                setFormData((current) => ({ ...current, accountHolderName: text }))
              }
              placeholder="Nombre completo"
            />
          </View>

          {formData.type === 'BANK_ACCOUNT' ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Banco *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.bank}
                  onChangeText={(text) => setFormData((current) => ({ ...current, bank: text }))}
                  placeholder="Ej: Bancolombia"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Tipo de cuenta *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.accountType}
                  onChangeText={(text) =>
                    setFormData((current) => ({ ...current, accountType: text }))
                  }
                  placeholder="Ahorros / Corriente"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Numero de cuenta *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.accountNumber}
                  onChangeText={(text) =>
                    setFormData((current) => ({ ...current, accountNumber: text }))
                  }
                  placeholder="Numero de cuenta"
                  keyboardType="number-pad"
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Billetera *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.walletProvider}
                  onChangeText={(text) =>
                    setFormData((current) => ({ ...current, walletProvider: text }))
                  }
                  placeholder="Ej: Nequi o Daviplata"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Numero *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.walletNumber}
                  onChangeText={(text) =>
                    setFormData((current) => ({ ...current, walletNumber: text }))
                  }
                  placeholder="Numero de la billetera"
                  keyboardType="phone-pad"
                />
              </View>
            </>
          )}

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Usar como metodo activo</Text>
            <Switch
              value={formData.active}
              onValueChange={(value) =>
                setFormData((current) => ({
                  ...current,
                  active: value,
                }))
              }
              trackColor={{ false: '#E0E0E0', true: COLORS.primary }}
            />
          </View>

          <AnimatedButton style={styles.submitButton} onPress={handleSubmit} disabled={saving}>
            {saving ? (
              <ActivityIndicator color={COLORS.textWhite} />
            ) : (
              <Text style={styles.submitButtonText}>
                {editingMethodId ? 'Guardar cambios' : 'Agregar metodo'}
              </Text>
            )}
          </AnimatedButton>

          {editingMethodId ? (
            <AnimatedButton style={styles.secondaryButton} onPress={resetForm}>
              <Text style={styles.secondaryButtonText}>Cancelar edicion</Text>
            </AnimatedButton>
          ) : null}
        </AnimatedCard>

        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>Tus metodos de pago</Text>
          <Text style={styles.countText}>{methods.length}</Text>
        </View>

        {methods.length === 0 ? (
          <AnimatedCard style={styles.emptyCard}>
            <Text style={styles.infoText}>
              Agrega una cuenta bancaria o una billetera movil para recibir tus liquidaciones.
            </Text>
          </AnimatedCard>
        ) : (
          methods.map((method) => (
            <AnimatedCard key={method.id} style={styles.methodCard}>
              <View style={styles.methodHeader}>
                <View style={styles.methodHeaderInfo}>
                  <Text style={styles.methodTitle}>{method.label}</Text>
                  <Text style={styles.methodSubtitle}>
                    {METHOD_TYPES[method.type] || method.type}
                  </Text>
                </View>
                {method.active ? (
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>Activo</Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.methodDetails}>
                Titular: {method.details?.accountHolderName || 'No definido'}
              </Text>
              {method.type === 'BANK_ACCOUNT' ? (
                <Text style={styles.methodDetails}>
                  {method.details?.bank || 'Banco'} · {method.details?.accountType || 'Cuenta'} ·{' '}
                  {method.details?.accountNumber || 'Sin numero'}
                </Text>
              ) : (
                <Text style={styles.methodDetails}>
                  {method.details?.walletProvider || 'Billetera'} · {method.details?.walletNumber || 'Sin numero'}
                </Text>
              )}

              <View style={styles.methodActions}>
                <AnimatedButton
                  style={[styles.smallButton, styles.editButton]}
                  onPress={() => fillForm(method)}
                >
                  <Text style={styles.smallButtonText}>Editar</Text>
                </AnimatedButton>
                {!method.active ? (
                  <AnimatedButton
                    style={[styles.smallButton, styles.activateButton]}
                    onPress={() => handleActivate(method.id)}
                  >
                    <Text style={styles.smallButtonText}>Activar</Text>
                  </AnimatedButton>
                ) : null}
              </View>
            </AnimatedCard>
          ))
        )}
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
    backgroundColor: COLORS.backgroundSecondary,
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
  marketplaceCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  activeCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  formCard: {
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
    lineHeight: 21,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h4,
    marginBottom: SPACING.md,
  },
  marketplaceText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  typeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  typeButton: {
    flex: 1,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundTertiary,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  typeButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  typeButtonText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textSecondary,
  },
  typeButtonTextActive: {
    color: COLORS.primary,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  label: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  input: {
    ...TYPOGRAPHY.body,
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: SPACING.sm,
  },
  switchLabel: {
    ...TYPOGRAPHY.bodyBold,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  submitButtonText: {
    ...TYPOGRAPHY.button,
  },
  secondaryButton: {
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  secondaryButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textSecondary,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  countText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.primary,
  },
  emptyCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  methodCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  methodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  methodHeaderInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  methodTitle: {
    ...TYPOGRAPHY.bodyBold,
    marginBottom: SPACING.xs,
  },
  methodSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  methodDetails: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  activeBadge: {
    backgroundColor: COLORS.accentGreen,
    borderRadius: BORDER_RADIUS.round,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  activeBadgeText: {
    ...TYPOGRAPHY.small,
    color: COLORS.textWhite,
    fontWeight: '600',
  },
  methodActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  smallButton: {
    flex: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: COLORS.primary,
  },
  activateButton: {
    backgroundColor: COLORS.accentGreen,
  },
  smallButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textWhite,
  },
});

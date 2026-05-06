import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as api from '../../../services/api';
import AnimatedCard from '../../../components/AnimatedCard';
import AnimatedButton from '../../../components/AnimatedButton';
import {
  COLORS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  TYPOGRAPHY,
} from '../../../styles/theme';
import { formatPriceNoDecimals } from '../../../utils/formatPrice';

const PAYMENT_STATUS_LABELS = {
  PAID: 'Pagada',
  PENDING_SETTLEMENT: 'Pendiente de liquidacion',
  LIQUIDATED: 'Liquidada',
};

const SETTLEMENT_STATUS_LABELS = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
};

export default function LiquidacionesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState('TODAY');
  const [historyMode, setHistoryMode] = useState('DAY');
  const [selectedDay, setSelectedDay] = useState('');
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const data = await api.getVeterinarianSettlementDashboard();
      setDashboard(data);
    } catch (error) {
      const message = error.message || 'No se pudo cargar la informacion';
      setErrorMessage(message);
      setDashboard(null);
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, []),
  );

  const toInputDate = (date) => {
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseInputDate = (value) => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split('-').map(Number);
    const parsed = new Date(year, month - 1, day);
    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      return null;
    }
    return parsed;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando liquidaciones...</Text>
      </View>
    );
  }

  if (errorMessage && !dashboard) {
    return (
      <View style={styles.errorContainer}>
        <AnimatedCard style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={42} color={COLORS.accentOrange} />
          <Text style={styles.errorTitle}>No se pudieron cargar tus liquidaciones</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <AnimatedButton style={styles.retryButton} onPress={loadDashboard}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </AnimatedButton>
        </AnimatedCard>
      </View>
    );
  }

  const summary = dashboard?.summary || {};
  const activeMethod = dashboard?.activePaymentMethod;
  const consultationHistory = Array.isArray(dashboard?.consultationHistory)
    ? dashboard.consultationHistory
    : [];
  const todayHistory = Array.isArray(dashboard?.todayHistory) ? dashboard.todayHistory : [];
  const settlements = Array.isArray(dashboard?.settlements)
    ? dashboard.settlements
    : [];
  const pendingSettlementAmount = summary.pendingSettlementNet || 0;

  const todayDateInput = toInputDate(new Date());
  const selectedDayDate = parseInputDate(selectedDay || todayDateInput);
  const rangeStartDate = parseInputDate(rangeStart);
  const rangeEndDate = parseInputDate(rangeEnd);

  const filteredHistory = consultationHistory.filter((item) => {
    const rawDate = item.approvedAt || item.consultationDate;
    const itemDate = rawDate ? new Date(rawDate) : null;
    if (!itemDate || Number.isNaN(itemDate.getTime())) return false;

    if (historyMode === 'DAY') {
      if (!selectedDayDate) return false;
      return toInputDate(itemDate) === toInputDate(selectedDayDate);
    }

    if (!rangeStartDate || !rangeEndDate) return false;
    const start = new Date(rangeStartDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(rangeEndDate);
    end.setHours(23, 59, 59, 999);
    return itemDate >= start && itemDate <= end;
  });

  const filteredHistoryTotals = filteredHistory.reduce(
    (acc, item) => {
      acc.gross += item.amount || 0;
      acc.net += item.netAmount || 0;
      return acc;
    },
    { gross: 0, net: 0 },
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Liquidaciones</Text>
        <Text style={styles.subtitle}>
          Mira tu saldo disponible y revisa tus consultas facturadas.
        </Text>
      </View>

      <AnimatedCard style={styles.heroCard}>
        <Text style={styles.heroLabel}>Saldo pendiente por recibir</Text>
        <Text style={styles.heroAmount}>${formatPriceNoDecimals(pendingSettlementAmount)}</Text>
        <Text style={styles.heroHelp}>
          Este es el valor acumulado que la plataforma te debe transferir.
        </Text>
        <View style={styles.heroMetaRow}>
          <Text style={styles.heroMetaText}>
            Hoy generaste: ${formatPriceNoDecimals(summary.totalNet || 0)}
          </Text>
          <Text style={styles.heroMetaText}>
            Comision: ${formatPriceNoDecimals(summary.totalCommission || 0)}
          </Text>
        </View>
      </AnimatedCard>

      <AnimatedCard style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
          <Text style={styles.infoTitle}>Comision de la aplicacion</Text>
        </View>
        <Text style={styles.infoText}>
          {summary.commissionText || 'La aplicacion cobra una comision por cada consulta realizada.'}
        </Text>
      </AnimatedCard>

      <View style={styles.tabsContainer}>
        <AnimatedButton
          style={[styles.tabButton, activeTab === 'TODAY' && styles.tabButtonActive]}
          onPress={() => setActiveTab('TODAY')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'TODAY' && styles.tabButtonTextActive]}>
            Consultas de hoy
          </Text>
        </AnimatedButton>
        <AnimatedButton
          style={[styles.tabButton, activeTab === 'HISTORY' && styles.tabButtonActive]}
          onPress={() => {
            setActiveTab('HISTORY');
            setSelectedDay((current) => current || todayDateInput);
          }}
        >
          <Text style={[styles.tabButtonText, activeTab === 'HISTORY' && styles.tabButtonTextActive]}>
            Consultas anteriores
          </Text>
        </AnimatedButton>
      </View>

      <AnimatedCard style={styles.methodCard}>
        <Text style={styles.sectionTitle}>Metodo de pago activo</Text>
        {activeMethod ? (
          <>
            <Text style={styles.methodTitle}>{activeMethod.label}</Text>
            <Text style={styles.methodSubtitle}>
              {activeMethod.type === 'BANK_ACCOUNT' ? 'Cuenta bancaria' : 'Billetera movil'}
            </Text>
          </>
        ) : (
          <Text style={styles.emptyText}>Aun no has configurado un metodo de pago activo.</Text>
        )}
        <AnimatedButton
          style={styles.actionButton}
          onPress={() => router.push('/veterinario/configurar-pagos')}
        >
          <Text style={styles.actionButtonText}>
            {activeMethod ? 'Administrar metodos de pago' : 'Configurar metodos de pago'}
          </Text>
        </AnimatedButton>
      </AnimatedCard>

      {activeTab === 'TODAY' ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Consultas realizadas hoy</Text>
            <Text style={styles.sectionCount}>{todayHistory.length}</Text>
          </View>

          {todayHistory.length === 0 ? (
            <AnimatedCard style={styles.emptyCard}>
              <Text style={styles.emptyText}>Todavia no tienes consultas facturadas hoy.</Text>
            </AnimatedCard>
          ) : (
            todayHistory.map((item) => (
              <AnimatedCard key={item.consultationId} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyTitle}>{item.client}</Text>
                    <Text style={styles.historySubtitle}>
                      {item.petName ? `${item.petName} · ` : ''}
                      {new Date(item.approvedAt || item.consultationDate).toLocaleString('es-CO')}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.badge,
                      item.paymentLifecycleStatus === 'LIQUIDATED'
                        ? styles.badgeSuccess
                        : styles.badgePending,
                    ]}
                  >
                    <Text style={styles.badgeText}>
                      {PAYMENT_STATUS_LABELS[item.paymentLifecycleStatus] || item.paymentLifecycleStatus}
                    </Text>
                  </View>
                </View>

                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Valor consulta</Text>
                  <Text style={styles.amountValue}>${formatPriceNoDecimals(item.amount)}</Text>
                </View>
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Comision</Text>
                  <Text style={styles.amountValue}>${formatPriceNoDecimals(item.commission)}</Text>
                </View>
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Neto</Text>
                  <Text style={[styles.amountValue, styles.summaryValuePositive]}>
                    ${formatPriceNoDecimals(item.netAmount)}
                  </Text>
                </View>
              </AnimatedCard>
            ))
          )}
        </>
      ) : (
        <>
          <AnimatedCard style={styles.filtersCard}>
            <View style={styles.filterModeRow}>
              <AnimatedButton
                style={[styles.filterModeButton, historyMode === 'DAY' && styles.filterModeButtonActive]}
                onPress={() => {
                  setHistoryMode('DAY');
                  setSelectedDay((current) => current || todayDateInput);
                }}
              >
                <Text
                  style={[
                    styles.filterModeText,
                    historyMode === 'DAY' && styles.filterModeTextActive,
                  ]}
                >
                  Por dia
                </Text>
              </AnimatedButton>
              <AnimatedButton
                style={[styles.filterModeButton, historyMode === 'RANGE' && styles.filterModeButtonActive]}
                onPress={() => setHistoryMode('RANGE')}
              >
                <Text
                  style={[
                    styles.filterModeText,
                    historyMode === 'RANGE' && styles.filterModeTextActive,
                  ]}
                >
                  Rango de fechas
                </Text>
              </AnimatedButton>
            </View>

            {historyMode === 'DAY' ? (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Dia (AAAA-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={selectedDay}
                  onChangeText={setSelectedDay}
                  placeholder={todayDateInput}
                  autoCapitalize="none"
                />
              </View>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Desde (AAAA-MM-DD)</Text>
                  <TextInput
                    style={styles.input}
                    value={rangeStart}
                    onChangeText={setRangeStart}
                    placeholder="2026-04-01"
                    autoCapitalize="none"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Hasta (AAAA-MM-DD)</Text>
                  <TextInput
                    style={styles.input}
                    value={rangeEnd}
                    onChangeText={setRangeEnd}
                    placeholder={todayDateInput}
                    autoCapitalize="none"
                  />
                </View>
              </>
            )}

            <View style={styles.historyTotalsRow}>
              <View style={styles.historyTotalBox}>
                <Text style={styles.historyTotalLabel}>Facturado</Text>
                <Text style={styles.historyTotalValue}>
                  ${formatPriceNoDecimals(filteredHistoryTotals.gross)}
                </Text>
              </View>
              <View style={styles.historyTotalBox}>
                <Text style={styles.historyTotalLabel}>Neto a recibir</Text>
                <Text style={[styles.historyTotalValue, styles.summaryValuePositive]}>
                  ${formatPriceNoDecimals(filteredHistoryTotals.net)}
                </Text>
              </View>
            </View>
          </AnimatedCard>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Resultados</Text>
            <Text style={styles.sectionCount}>{filteredHistory.length}</Text>
          </View>

          {filteredHistory.length === 0 ? (
            <AnimatedCard style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                No hay consultas para ese filtro. Verifica el formato de fechas (AAAA-MM-DD).
              </Text>
            </AnimatedCard>
          ) : (
            filteredHistory.map((item) => (
              <AnimatedCard key={item.consultationId} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyTitle}>{item.client}</Text>
                    <Text style={styles.historySubtitle}>
                      {item.petName ? `${item.petName} · ` : ''}
                      {new Date(item.approvedAt || item.consultationDate).toLocaleString('es-CO')}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.badge,
                      item.paymentLifecycleStatus === 'LIQUIDATED'
                        ? styles.badgeSuccess
                        : styles.badgePending,
                    ]}
                  >
                    <Text style={styles.badgeText}>
                      {PAYMENT_STATUS_LABELS[item.paymentLifecycleStatus] || item.paymentLifecycleStatus}
                    </Text>
                  </View>
                </View>

                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Valor consulta</Text>
                  <Text style={styles.amountValue}>${formatPriceNoDecimals(item.amount)}</Text>
                </View>
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Comision</Text>
                  <Text style={styles.amountValue}>${formatPriceNoDecimals(item.commission)}</Text>
                </View>
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Neto</Text>
                  <Text style={[styles.amountValue, styles.summaryValuePositive]}>
                    ${formatPriceNoDecimals(item.netAmount)}
                  </Text>
                </View>
              </AnimatedCard>
            ))
          )}
        </>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Lotes recientes</Text>
      </View>

      {settlements.length === 0 ? (
        <AnimatedCard style={styles.emptyCard}>
          <Text style={styles.emptyText}>Aun no se han generado liquidaciones para tu cuenta.</Text>
        </AnimatedCard>
      ) : (
        settlements.map((settlement) => (
          <AnimatedCard key={settlement.id} style={styles.settlementCard}>
            <View style={styles.historyHeader}>
              <View style={styles.historyInfo}>
                <Text style={styles.historyTitle}>
                  Corte {new Date(settlement.settlementDate).toLocaleDateString('es-CO')}
                </Text>
                <Text style={styles.historySubtitle}>
                  {settlement.totalConsultations} consulta(s) · Metodo:{' '}
                  {settlement.paymentMethod?.label || 'Sin asignar'}
                </Text>
              </View>
              <View
                style={[
                  styles.badge,
                  settlement.status === 'PAID' ? styles.badgeSuccess : styles.badgePending,
                ]}
              >
                <Text style={styles.badgeText}>
                  {SETTLEMENT_STATUS_LABELS[settlement.status] || settlement.status}
                </Text>
              </View>
            </View>
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Bruto</Text>
              <Text style={styles.amountValue}>${formatPriceNoDecimals(settlement.totalGross)}</Text>
            </View>
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Comision</Text>
              <Text style={styles.amountValue}>
                ${formatPriceNoDecimals(settlement.totalCommission)}
              </Text>
            </View>
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Neto</Text>
              <Text style={[styles.amountValue, styles.summaryValuePositive]}>
                ${formatPriceNoDecimals(settlement.totalNet)}
              </Text>
            </View>
          </AnimatedCard>
        ))
      )}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    padding: SPACING.xl,
  },
  errorCard: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xxl,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  errorTitle: {
    ...TYPOGRAPHY.h4,
    textAlign: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  errorText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxl,
    alignItems: 'center',
    marginTop: SPACING.xl,
    minWidth: 160,
  },
  retryButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textWhite,
  },
  header: {
    marginBottom: SPACING.xl,
  },
  title: {
    ...TYPOGRAPHY.h2,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  heroCard: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  heroLabel: {
    ...TYPOGRAPHY.caption,
    color: 'rgba(255,255,255,0.86)',
    marginBottom: SPACING.sm,
  },
  heroAmount: {
    ...TYPOGRAPHY.h1,
    color: COLORS.textWhite,
    marginBottom: SPACING.sm,
  },
  heroHelp: {
    ...TYPOGRAPHY.caption,
    color: 'rgba(255,255,255,0.92)',
    lineHeight: 20,
  },
  heroMetaRow: {
    marginTop: SPACING.md,
    gap: SPACING.xs,
  },
  heroMetaText: {
    ...TYPOGRAPHY.small,
    color: 'rgba(255,255,255,0.95)',
  },
  infoCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  infoTitle: {
    ...TYPOGRAPHY.bodyBold,
  },
  infoText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  tabButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  tabButtonText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textSecondary,
  },
  tabButtonTextActive: {
    color: COLORS.primary,
  },
  summaryValuePositive: {
    color: COLORS.accentGreen,
  },
  methodCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  methodTitle: {
    ...TYPOGRAPHY.bodyBold,
    marginBottom: SPACING.xs,
  },
  methodSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  actionButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textWhite,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h4,
  },
  sectionCount: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.primary,
  },
  filtersCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  filterModeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  filterModeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    backgroundColor: COLORS.backgroundTertiary,
  },
  filterModeButtonActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  filterModeText: {
    ...TYPOGRAPHY.small,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  filterModeTextActive: {
    color: COLORS.primary,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  input: {
    ...TYPOGRAPHY.body,
    backgroundColor: COLORS.backgroundTertiary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  historyTotalsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  historyTotalBox: {
    flex: 1,
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  historyTotalLabel: {
    ...TYPOGRAPHY.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  historyTotalValue: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
  },
  historyCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  historyInfo: {
    flex: 1,
  },
  historyTitle: {
    ...TYPOGRAPHY.bodyBold,
    marginBottom: 2,
  },
  historySubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  badgePending: {
    backgroundColor: COLORS.accentOrange,
  },
  badgeSuccess: {
    backgroundColor: COLORS.accentGreen,
  },
  badgeText: {
    ...TYPOGRAPHY.small,
    color: COLORS.textWhite,
    fontWeight: '600',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  amountLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  amountValue: {
    ...TYPOGRAPHY.bodyBold,
  },
  emptyCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  emptyText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  settlementCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
});

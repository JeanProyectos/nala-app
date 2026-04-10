import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as api from '../../../services/api';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

export default function PagoConsultaScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const consultationId = parseInt(id);

  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const [successMessageShown, setSuccessMessageShown] = useState(false);

  const canPayConsultation = (data) => {
    if (!data) {
      return false;
    }

    const payableStatuses = ['PENDING_PAYMENT', 'PENDING_APPROVAL', 'IN_PROGRESS', 'FINISHED'];
    return payableStatuses.includes(data.status) && data.payment?.status !== 'APPROVED';
  };

  useFocusEffect(
    useCallback(() => {
      loadConsultation();
    }, [consultationId])
  );

  useEffect(() => {
    if (!checkoutUrl || consultation?.payment?.status === 'APPROVED' || consultation?.status === 'PAID') {
      return undefined;
    }

    const interval = setInterval(() => {
      loadConsultation();
    }, 4000);

    return () => clearInterval(interval);
  }, [checkoutUrl, consultation?.payment?.status, consultation?.status]);

  const loadConsultation = async () => {
    try {
      setLoading(true);
      const data = await api.getConsultation(consultationId);
      setConsultation(data);

      if ((data.payment?.status === 'APPROVED' || data.status === 'PAID') && !successMessageShown) {
        setSuccessMessageShown(true);
        Alert.alert(
          'Pago exitoso',
          'Tu pago fue aprobado. Ya puedes continuar con la consulta.',
        );
      }

      // Si está rechazada, mostrar mensaje
      if (data.status === 'REJECTED') {
        Alert.alert(
          'Consulta Rechazada',
          'El veterinario ha rechazado esta consulta. No puedes realizar el pago.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      if (canPayConsultation(data) && !checkoutUrl) {
        await createPayment(false);
      }
    } catch (error) {
      console.error('Error cargando consulta:', error);
      Alert.alert('Error', 'No se pudo cargar la consulta');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const createPayment = async (shouldOpenCheckout = true) => {
    try {
      setProcessing(true);
      
      const redirectUrl = `nala://consultar/pago-consulta?id=${consultationId}`;
      
      console.log('💳 Creando pago para consulta:', consultationId);
      const result = await api.createPayment(consultationId, redirectUrl);
      
      console.log('✅ Pago creado:', result);
      
      if (!result || !result.checkoutUrl) {
        throw new Error('No se recibió la URL de pago del servidor');
      }
      
      setCheckoutUrl(result.checkoutUrl);
      
      if (shouldOpenCheckout) {
        const canOpen = await Linking.canOpenURL(result.checkoutUrl);
        if (canOpen) {
          await Linking.openURL(result.checkoutUrl);
        } else {
          Alert.alert(
            'URL de pago',
            `Copia este enlace y ábrelo en tu navegador:\n\n${result.checkoutUrl}`,
            [
              { text: 'OK' },
              { text: 'Copiar', onPress: () => {
                Alert.alert('URL copiada', result.checkoutUrl);
              }},
            ]
          );
        }
      }
    } catch (error) {
      console.error('❌ Error creando pago:', error);
      const errorMessage = error.message || error.error || 'No se pudo crear el pago';
      Alert.alert('Error', errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const handlePayNow = async () => {
    await createPayment();
  };

  const handleCheckStatus = async () => {
    await loadConsultation();
  };

  const handleDeclinePayment = async () => {
    Alert.alert(
      'Finalizar sin pagar',
      'Si decides no pagar, la consulta se cerrará y se notificará al veterinario. Esta acción no se puede deshacer.',
      [
        { text: 'Volver', style: 'cancel' },
        {
          text: 'No pagar y finalizar',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessing(true);
              await api.finishConsultation(consultationId, false, { reason: 'USER_DECLINED_PAYMENT' });
              Alert.alert('Consulta finalizada', 'La consulta se cerró sin pago.', [
                { text: 'OK', onPress: () => router.replace('/(tabs)/consultar/pacientes') },
              ]);
            } catch (error) {
              Alert.alert('Error', error.message || 'No se pudo finalizar la consulta');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B7FA8" />
        <Text style={styles.loadingText}>Cargando información...</Text>
      </View>
    );
  }

  if (!consultation) {
    return null;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pago de Consulta</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Veterinario</Text>
        <Text style={styles.infoValue}>
          {consultation.veterinarian?.fullName || 'N/A'}
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Tipo de Consulta</Text>
        <Text style={styles.infoValue}>
          {consultation.type === 'CHAT' && '💬 Chat'}
          {consultation.type === 'VOICE' && '📞 Llamada de Voz'}
          {consultation.type === 'VIDEO' && '📹 Videollamada'}
        </Text>
      </View>

      <View style={styles.priceCard}>
        <Text style={styles.priceLabel}>Total a Pagar</Text>
        <Text style={styles.priceValue}>
          ${consultation.price?.toLocaleString('es-CO') || '0'} COP
        </Text>
        <View style={styles.feeBreakdown}>
          <Text style={styles.feeText}>
            Comisión plataforma: ${consultation.platformFee?.toLocaleString('es-CO') || '0'} COP
          </Text>
          <Text style={styles.feeText}>
            Veterinario recibe: ${consultation.veterinarianAmount?.toLocaleString('es-CO') || '0'} COP
          </Text>
        </View>
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Estado</Text>
        <Text style={styles.statusValue}>
          {consultation.payment?.status === 'APPROVED'
            ? '✅ Pago aprobado'
            : null}
          {consultation.status === 'PENDING_PAYMENT' && '⏳ Pendiente de Pago'}
          {consultation.status === 'PENDING_APPROVAL' && '⏳ Pendiente de Aprobación - Puedes Pagar'}
          {consultation.status === 'IN_PROGRESS' && consultation.payment?.status !== 'APPROVED' && '💳 Consulta en curso - Pago requerido para continuar'}
          {consultation.status === 'PAID' && '✅ Pagada'}
          {consultation.status === 'IN_PROGRESS' && '🟢 En Progreso'}
          {consultation.status === 'FINISHED' && '✅ Finalizada - Pendiente de Pago'}
          {consultation.status === 'REJECTED' && '❌ Rechazada'}
          {consultation.status === 'EXPIRED' && '❌ Expirada'}
        </Text>
      </View>

      {canPayConsultation(consultation) && (
        <>
          <TouchableOpacity
            style={[styles.payButton, processing && styles.payButtonDisabled]}
            onPress={handlePayNow}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.payButtonText}>💳 Pagar Ahora</Text>
                <Text style={styles.payButtonSubtext}>
                  Serás redirigido a Mercado Pago para completar el pago
                </Text>
              </>
            )}
          </TouchableOpacity>

          {checkoutUrl && (
            <TouchableOpacity
              style={styles.checkStatusButton}
              onPress={handleCheckStatus}
            >
              <Text style={styles.checkStatusText}>
                🔄 Verificar Estado del Pago
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.cancelConsultationButton, processing && styles.payButtonDisabled]}
            onPress={handleDeclinePayment}
            disabled={processing}
          >
            <Text style={styles.cancelConsultationButtonText}>❌ No pagar y finalizar consulta</Text>
          </TouchableOpacity>
        </>
      )}

      {(consultation.payment?.status === 'APPROVED' || consultation.status === 'PAID') && (
        <View style={styles.successBox}>
          <Text style={styles.successText}>
            ✅ Tu pago fue aprobado. Ya puedes continuar con la consulta.
          </Text>
        </View>
      )}

      {(consultation.payment?.status === 'APPROVED' || consultation.status === 'PAID') && (
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => router.replace(`consulta-chat?id=${consultationId}`)}
        >
          <Text style={styles.chatButtonText}>
            {consultation.status === 'IN_PROGRESS' ? '💬 Continuar Consulta' : '💬 Ir al Chat'}
          </Text>
        </TouchableOpacity>
      )}

      {(consultation.status === 'PENDING_PAYMENT' ||
        consultation.status === 'PENDING_APPROVAL' ||
        consultation.status === 'IN_PROGRESS') && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            {consultation.status === 'PENDING_APPROVAL' 
              ? '💡 Puedes pagar ahora. El veterinario aprobará la consulta después del pago.'
              : consultation.status === 'IN_PROGRESS'
                ? '⚠️ Ya inició la consulta. Si no pagas, no podrás seguir escribiendo ni continuar la llamada.'
                : '⚠️ La consulta expirará en 30 minutos si no se completa el pago'}
          </Text>
        </View>
      )}

      {consultation.status === 'FINISHED' && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            ✅ La consulta ha finalizado. Por favor completa el pago.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  content: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    fontSize: 24,
    color: '#8B7FA8',
    width: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  priceCard: {
    backgroundColor: '#8B7FA8',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 8,
  },
  priceValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  feeBreakdown: {
    width: '100%',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  feeText: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 4,
    textAlign: 'center',
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  payButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  payButtonSubtext: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.9,
  },
  checkStatusButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#8B7FA8',
    marginBottom: 12,
  },
  checkStatusText: {
    color: '#8B7FA8',
    fontSize: 16,
    fontWeight: '600',
  },
  successBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  successText: {
    fontSize: 15,
    color: '#2E7D32',
    fontWeight: '600',
    textAlign: 'center',
  },
  chatButton: {
    backgroundColor: '#8B7FA8',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  warningBox: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
    marginTop: 12,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  cancelConsultationButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E53935',
    marginBottom: 12,
  },
  cancelConsultationButtonText: {
    color: '#E53935',
    fontSize: 16,
    fontWeight: '700',
  },
});

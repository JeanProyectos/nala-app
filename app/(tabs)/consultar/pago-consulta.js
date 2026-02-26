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

  useFocusEffect(
    useCallback(() => {
      loadConsultation();
    }, [consultationId])
  );

  const loadConsultation = async () => {
    try {
      setLoading(true);
      const data = await api.getConsultation(consultationId);
      setConsultation(data);

      // Si está en progreso o pagada, redirigir al chat
      if (data.status === 'IN_PROGRESS' || data.status === 'PAID') {
        router.replace(`consulta-chat?id=${consultationId}`);
        return;
      }

      // Si está finalizada y no pagada, mostrar opción de pago
      if (data.status === 'FINISHED' && (!data.payment || data.payment.status !== 'APPROVED')) {
        // Consulta finalizada, necesita pago
        return;
      }

      // Si hay un pago pendiente, obtener el checkout URL
      if (data.payment && data.payment.status === 'PENDING') {
        // Ya hay un pago creado, podríamos obtener el URL del pago
        // Por ahora, crear uno nuevo
        await createPayment();
      }
    } catch (error) {
      console.error('Error cargando consulta:', error);
      Alert.alert('Error', 'No se pudo cargar la consulta');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const createPayment = async () => {
    try {
      setProcessing(true);
      
      // URL de redirección después del pago
      const redirectUrl = `exp://192.168.20.53:8081/--/consultation/${consultationId}/payment-callback`;
      
      const result = await api.createPayment(consultationId, redirectUrl);
      setCheckoutUrl(result.checkoutUrl);
      
      // Abrir el checkout de Wompi
      if (result.checkoutUrl) {
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
                // En React Native necesitarías un módulo de clipboard
                Alert.alert('URL copiada', result.checkoutUrl);
              }},
            ]
          );
        }
      }
    } catch (error) {
      console.error('Error creando pago:', error);
      Alert.alert('Error', error.message || 'No se pudo crear el pago');
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
          {consultation.status === 'PENDING_PAYMENT' && '⏳ Pendiente de Pago'}
          {consultation.status === 'PAID' && '✅ Pagada'}
          {consultation.status === 'IN_PROGRESS' && '🟢 En Progreso'}
          {consultation.status === 'FINISHED' && '✅ Finalizada - Pendiente de Pago'}
          {consultation.status === 'EXPIRED' && '❌ Expirada'}
        </Text>
      </View>

      {(consultation.status === 'PENDING_PAYMENT' || consultation.status === 'FINISHED') && (
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
                  Serás redirigido a Wompi para completar el pago
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
        </>
      )}

      {consultation.status === 'PAID' && (
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => router.replace(`consulta-chat?id=${consultationId}`)}
        >
          <Text style={styles.chatButtonText}>💬 Ir al Chat</Text>
        </TouchableOpacity>
      )}

      {consultation.status === 'PENDING_PAYMENT' && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠️ La consulta expirará en 30 minutos si no se completa el pago
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
});

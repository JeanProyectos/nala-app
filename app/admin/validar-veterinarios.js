import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import * as api from '../../services/api';

const SPECIALTIES = {
  GENERAL: 'General',
  DERMATOLOGY: 'Dermatología',
  NUTRITION: 'Nutrición',
  SURGERY: 'Cirugía',
  CARDIOLOGY: 'Cardiología',
  ONCOLOGY: 'Oncología',
  ORTHOPEDICS: 'Ortopedia',
  BEHAVIOR: 'Comportamiento',
  EMERGENCY: 'Emergencias',
};

export default function ValidarVeterinariosScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [veterinarians, setVeterinarians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    // Verificar que es admin
    if (user?.role !== 'ADMIN') {
      Alert.alert('Acceso denegado', 'Solo administradores pueden acceder a esta sección.');
      router.back();
      return;
    }
    loadPendingVeterinarians();
  }, [user]);

  const loadPendingVeterinarians = async () => {
    try {
      setLoading(true);
      const data = await api.getPendingVeterinarians();
      setVeterinarians(data || []);
    } catch (error) {
      console.error('Error cargando veterinarios pendientes:', error);
      Alert.alert('Error', error.message || 'No se pudieron cargar los veterinarios pendientes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleVerify = async (veterinarianId, status, veterinarianName) => {
    const action = status === 'VERIFIED' ? 'aprobar' : 'rechazar';
    
    Alert.alert(
      `¿${action.charAt(0).toUpperCase() + action.slice(1)} veterinario?`,
      `¿Estás seguro de que quieres ${action} a ${veterinarianName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          style: status === 'VERIFIED' ? 'default' : 'destructive',
          onPress: async () => {
            try {
              setProcessingId(veterinarianId);
              await api.verifyVeterinarian(veterinarianId, status, '');
              Alert.alert(
                'Éxito',
                `Veterinario ${status === 'VERIFIED' ? 'aprobado' : 'rechazado'} correctamente`,
                [{ text: 'OK', onPress: loadPendingVeterinarians }]
              );
            } catch (error) {
              console.error('Error verificando veterinario:', error);
              Alert.alert('Error', error.message || 'No se pudo verificar el veterinario');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  if (loading && veterinarians.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B7FA8" />
        <Text style={styles.loadingText}>Cargando veterinarios pendientes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Validar Veterinarios</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadPendingVeterinarians} />
        }
      >
        {veterinarians.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle" size={64} color="#8B7FA8" />
            <Text style={styles.emptyTitle}>No hay veterinarios pendientes</Text>
            <Text style={styles.emptyText}>
              Todos los veterinarios han sido verificados
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#8B7FA8" />
              <Text style={styles.infoText}>
                {veterinarians.length} veterinario(s) esperando verificación
              </Text>
            </View>

            {veterinarians.map((vet) => (
              <View key={vet.id} style={styles.vetCard}>
                <View style={styles.vetHeader}>
                  <View style={styles.vetInfo}>
                    <Text style={styles.vetName}>{vet.fullName}</Text>
                    <Text style={styles.vetEmail}>{vet.user?.email}</Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>⏳ Pendiente</Text>
                  </View>
                </View>

                <View style={styles.vetDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="location" size={16} color="#666" />
                    <Text style={styles.detailText}>
                      {vet.city}, {vet.country}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="medical" size={16} color="#666" />
                    <Text style={styles.detailText}>
                      {SPECIALTIES[vet.specialty] || vet.specialty}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="time" size={16} color="#666" />
                    <Text style={styles.detailText}>
                      {vet.yearsExperience} años de experiencia
                    </Text>
                  </View>

                  {vet.professionalDescription && (
                    <View style={styles.descriptionBox}>
                      <Text style={styles.descriptionText}>
                        {vet.professionalDescription}
                      </Text>
                    </View>
                  )}

                  <View style={styles.pricesRow}>
                    <View style={styles.priceItem}>
                      <Text style={styles.priceLabel}>Chat</Text>
                      <Text style={styles.priceValue}>${vet.priceChat?.toFixed(0) || 0}</Text>
                    </View>
                    <View style={styles.priceItem}>
                      <Text style={styles.priceLabel}>Voz</Text>
                      <Text style={styles.priceValue}>${vet.priceVoice?.toFixed(0) || 0}</Text>
                    </View>
                    <View style={styles.priceItem}>
                      <Text style={styles.priceLabel}>Video</Text>
                      <Text style={styles.priceValue}>${vet.priceVideo?.toFixed(0) || 0}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleVerify(vet.id, 'INACTIVE', vet.fullName)}
                    disabled={processingId === vet.id}
                  >
                    {processingId === vet.id ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Rechazar</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={() => handleVerify(vet.id, 'VERIFIED', vet.fullName)}
                    disabled={processingId === vet.id}
                  >
                    {processingId === vet.id ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Aprobar</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
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
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '500',
  },
  vetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  vetInfo: {
    flex: 1,
  },
  vetName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  vetEmail: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#856404',
  },
  vetDetails: {
    marginTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  descriptionBox: {
    backgroundColor: '#F8F8F8',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  pricesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  priceItem: {
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B7FA8',
  },
  actions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  rejectButton: {
    backgroundColor: '#FF5252',
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

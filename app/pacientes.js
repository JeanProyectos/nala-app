import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import * as api from '../services/api';

export default function PacientesScreen() {
  const router = useRouter();
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, active, finished

  useFocusEffect(
    useCallback(() => {
      loadConsultations();
    }, [filter])
  );

  const loadConsultations = async () => {
    try {
      setLoading(true);
      // El endpoint getMyConsultations ahora devuelve las consultas del veterinario
      // si el usuario es VET, o las consultas del usuario si es USER
      const allConsultations = await api.getMyConsultations();
      
      // Filtrar por estado
      let filtered = allConsultations;
      if (filter === 'active') {
        filtered = allConsultations.filter(c => c.status === 'ACTIVE');
      } else if (filter === 'finished') {
        filtered = allConsultations.filter(c => c.status === 'FINISHED');
      }

      setConsultations(filtered);
    } catch (error) {
      console.error('Error cargando consultas:', error);
      Alert.alert('Error', 'No se pudieron cargar las consultas');
    } finally {
      setLoading(false);
    }
  };

  const handleViewConsultation = (consultation) => {
    router.push(`/consulta-chat?id=${consultation.id}`);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING':
        return '#FF9800';
      case 'ACTIVE':
        return '#4CAF50';
      case 'FINISHED':
        return '#9E9E9E';
      case 'CANCELLED':
        return '#F44336';
      default:
        return '#666';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'PENDING':
        return 'Pendiente';
      case 'ACTIVE':
        return 'Activa';
      case 'FINISHED':
        return 'Finalizada';
      case 'CANCELLED':
        return 'Cancelada';
      default:
        return status;
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'CHAT':
        return '💬';
      case 'VOICE':
        return '📞';
      case 'VIDEO':
        return '📹';
      default:
        return '💬';
    }
  };

  return (
    <View style={styles.container}>
      {/* Filtros */}
      <View style={styles.filters}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            Todas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'active' && styles.filterButtonActive]}
          onPress={() => setFilter('active')}
        >
          <Text style={[styles.filterText, filter === 'active' && styles.filterTextActive]}>
            Activas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'finished' && styles.filterButtonActive]}
          onPress={() => setFilter('finished')}
        >
          <Text style={[styles.filterText, filter === 'finished' && styles.filterTextActive]}>
            Finalizadas
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B7FA8" />
        </View>
      ) : consultations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyText}>No tienes pacientes aún</Text>
          <Text style={styles.emptySubtext}>
            Las consultas que realices aparecerán aquí
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.listContainer}>
          {consultations.map((consultation) => (
            <TouchableOpacity
              key={consultation.id}
              style={styles.consultationCard}
              onPress={() => handleViewConsultation(consultation)}
            >
              <View style={styles.cardHeader}>
                {consultation.pet?.photo ? (
                  <Image
                    source={{ uri: consultation.pet.photo }}
                    style={styles.petPhoto}
                  />
                ) : (
                  <View style={styles.petPhotoPlaceholder}>
                    <Text style={styles.petPhotoIcon}>🐾</Text>
                  </View>
                )}
                <View style={styles.cardInfo}>
                  <Text style={styles.patientName}>
                    {consultation.user?.name || 'Usuario'}
                  </Text>
                  {consultation.pet && (
                    <Text style={styles.petName}>
                      Mascota: {consultation.pet.name}
                    </Text>
                  )}
                  <Text style={styles.consultationType}>
                    {getTypeIcon(consultation.type)} {consultation.type}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(consultation.status) },
                  ]}
                >
                  <Text style={styles.statusText}>
                    {getStatusLabel(consultation.status)}
                  </Text>
                </View>
              </View>
              <View style={styles.cardFooter}>
                <Text style={styles.dateText}>
                  {new Date(consultation.createdAt).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
                <Text style={styles.costText}>
                  ${consultation.cost?.toFixed(2) || '0.00'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  filters: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    gap: 12,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#8B7FA8',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#8B7FA8',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  consultationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  petPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  petPhotoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0E6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  petPhotoIcon: {
    fontSize: 30,
  },
  cardInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  petName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  consultationType: {
    fontSize: 14,
    color: '#8B7FA8',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
  costText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
});

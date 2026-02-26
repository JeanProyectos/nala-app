import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as api from '../../../services/api';

const REMINDER_TYPES = {
  VACCINE: { icon: '💉', color: '#4CAF50', label: 'Vacuna' },
  DEWORMING: { icon: '🐛', color: '#FF9800', label: 'Desparasitante' },
  HEALTH_CHECK: { icon: '🏥', color: '#2196F3', label: 'Revisión de Salud' },
};

const REMINDER_STATUS = {
  PENDING: { label: 'Pendiente', color: '#FF9800' },
  COMPLETED: { label: 'Completado', color: '#4CAF50' },
  POSTPONED: { label: 'Pospuesto', color: '#9E9E9E' },
  SENT: { label: 'Enviado', color: '#2196F3' },
};

export default function RecordatoriosScreen() {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState(null); // null = todos, 'PENDING' = solo pendientes

  useFocusEffect(
    useCallback(() => {
      loadReminders();
    }, [filter])
  );

  const loadReminders = async () => {
    try {
      setLoading(true);
      const data = await api.getReminders(filter);
      setReminders(data);
    } catch (error) {
      console.error('Error cargando recordatorios:', error);
      Alert.alert('Error', 'No se pudieron cargar los recordatorios');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadReminders();
  };

  const handleMarkCompleted = async (id) => {
    try {
      await api.updateReminder(id, { status: 'COMPLETED' });
      Alert.alert('Éxito', 'Recordatorio marcado como completado');
      await loadReminders();
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo actualizar el recordatorio');
    }
  };

  const handlePostpone = async (id) => {
    // Calcular fecha para mañana
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const postponedDate = tomorrow.toISOString().split('T')[0];

    try {
      await api.updateReminder(id, {
        status: 'POSTPONED',
        postponedTo: postponedDate,
      });
      Alert.alert('Éxito', 'Recordatorio pospuesto para mañana');
      await loadReminders();
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo posponer el recordatorio');
    }
  };

  const handleDelete = async (id) => {
    Alert.alert(
      'Confirmar',
      '¿Estás seguro de que quieres eliminar este recordatorio?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteReminder(id);
              Alert.alert('Éxito', 'Recordatorio eliminado');
              await loadReminders();
            } catch (error) {
              Alert.alert('Error', error.message || 'No se pudo eliminar el recordatorio');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reminderDate = new Date(date);
    reminderDate.setHours(0, 0, 0, 0);

    const diffTime = reminderDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Mañana';
    if (diffDays === -1) return 'Ayer';
    if (diffDays > 0) return `En ${diffDays} días`;
    return `Hace ${Math.abs(diffDays)} días`;
  };

  const getUrgencyColor = (scheduledAt, status) => {
    if (status === 'COMPLETED') return '#4CAF50';
    if (status === 'POSTPONED') return '#9E9E9E';

    const date = new Date(scheduledAt);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reminderDate = new Date(date);
    reminderDate.setHours(0, 0, 0, 0);

    const diffTime = reminderDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return '#F44336'; // Rojo - pasado
    if (diffDays === 0) return '#FF5722'; // Naranja - hoy
    if (diffDays <= 3) return '#FF9800'; // Amarillo - pronto
    return '#4CAF50'; // Verde - futuro
  };

  const pendingReminders = reminders.filter((r) => r.status === 'PENDING');
  const completedReminders = reminders.filter((r) => r.status === 'COMPLETED');

  return (
    <View style={styles.container}>
      {/* Filtros */}
      <View style={styles.filters}>
        <TouchableOpacity
          style={[styles.filterButton, filter === null && styles.filterButtonActive]}
          onPress={() => setFilter(null)}
        >
          <Text style={[styles.filterText, filter === null && styles.filterTextActive]}>
            Todos ({reminders.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'PENDING' && styles.filterButtonActive]}
          onPress={() => setFilter('PENDING')}
        >
          <Text style={[styles.filterText, filter === 'PENDING' && styles.filterTextActive]}>
            Pendientes ({pendingReminders.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B7FA8" />
          </View>
        ) : reminders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No hay recordatorios</Text>
            <Text style={styles.emptySubtext}>
              Los recordatorios se generan automáticamente basados en tus registros de salud
            </Text>
          </View>
        ) : (
          <>
            {/* Recordatorios Pendientes */}
            {pendingReminders.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pendientes</Text>
                {pendingReminders.map((reminder) => {
                  const typeInfo = REMINDER_TYPES[reminder.type] || REMINDER_TYPES.HEALTH_CHECK;
                  const urgencyColor = getUrgencyColor(reminder.scheduledAt, reminder.status);

                  return (
                    <View key={reminder.id} style={styles.reminderCard}>
                      <View style={styles.reminderHeader}>
                        <View style={styles.reminderIconContainer}>
                          <Text style={styles.reminderIcon}>{typeInfo.icon}</Text>
                        </View>
                        <View style={styles.reminderInfo}>
                          <Text style={styles.reminderTitle}>{reminder.title}</Text>
                          <Text style={styles.reminderPet}>🐾 {reminder.pet.name}</Text>
                        </View>
                        <View style={[styles.urgencyBadge, { backgroundColor: urgencyColor }]}>
                          <Text style={styles.urgencyText}>
                            {formatDate(reminder.scheduledAt)}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.reminderMessage}>{reminder.message}</Text>
                      <View style={styles.reminderActions}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.completeButton]}
                          onPress={() => handleMarkCompleted(reminder.id)}
                        >
                          <Text style={styles.actionButtonText}>✓ Completar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.postponeButton]}
                          onPress={() => handlePostpone(reminder.id)}
                        >
                          <Text style={styles.actionButtonText}>⏰ Posponer</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.deleteButton]}
                          onPress={() => handleDelete(reminder.id)}
                        >
                          <Text style={styles.actionButtonText}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Recordatorios Completados */}
            {completedReminders.length > 0 && filter !== 'PENDING' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Completados</Text>
                {completedReminders.map((reminder) => {
                  const typeInfo = REMINDER_TYPES[reminder.type] || REMINDER_TYPES.HEALTH_CHECK;

                  return (
                    <View key={reminder.id} style={[styles.reminderCard, styles.completedCard]}>
                      <View style={styles.reminderHeader}>
                        <View style={styles.reminderIconContainer}>
                          <Text style={styles.reminderIcon}>{typeInfo.icon}</Text>
                        </View>
                        <View style={styles.reminderInfo}>
                          <Text style={[styles.reminderTitle, styles.completedTitle]}>
                            {reminder.title}
                          </Text>
                          <Text style={styles.reminderPet}>🐾 {reminder.pet.name}</Text>
                        </View>
                        <Text style={styles.completedBadge}>✓</Text>
                      </View>
                      <Text style={[styles.reminderMessage, styles.completedMessage]}>
                        {reminder.message}
                      </Text>
                      {reminder.completedAt && (
                        <Text style={styles.completedDate}>
                          Completado: {formatDate(reminder.completedAt)}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  filters: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#F8F8F8',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    gap: 12,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
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
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  reminderCard: {
    backgroundColor: '#F0E6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#8B7FA8',
  },
  completedCard: {
    backgroundColor: '#F5F5F5',
    borderLeftColor: '#4CAF50',
    opacity: 0.7,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reminderIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reminderIcon: {
    fontSize: 24,
  },
  reminderInfo: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  reminderPet: {
    fontSize: 14,
    color: '#666',
  },
  urgencyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  urgencyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  completedBadge: {
    fontSize: 24,
    color: '#4CAF50',
  },
  reminderMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  completedMessage: {
    color: '#999',
  },
  completedDate: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  reminderActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
  },
  postponeButton: {
    backgroundColor: '#FF9800',
  },
  deleteButton: {
    backgroundColor: '#F44336',
    flex: 0.5,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

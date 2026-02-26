import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as api from '../../services/api';

export default function InicioScreen() {
  const router = useRouter();
  const [pets, setPets] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [vaccines, setVaccines] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const [petsData, remindersData] = await Promise.all([
        api.getPets(),
        api.getReminders('PENDING'),
      ]);

      setPets(petsData);
      setReminders(remindersData);

      // Obtener próxima vacuna de la primera mascota
      if (petsData.length > 0) {
        const vaccinesData = await api.getVaccinesByPet(petsData[0].id);
        const upcomingVaccines = vaccinesData
          .filter((v) => v.nextDose && new Date(v.nextDose) > new Date())
          .sort((a, b) => new Date(a.nextDose) - new Date(b.nextDose));
        setVaccines(upcomingVaccines.slice(0, 1));
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNextReminder = () => {
    if (reminders.length === 0) return null;
    return reminders.sort(
      (a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)
    )[0];
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reminderDate = new Date(date);
    reminderDate.setHours(0, 0, 0, 0);

    const diffTime = reminderDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Mañana';
    if (diffDays > 0) return `En ${diffDays} días`;
    return `Hace ${Math.abs(diffDays)} días`;
  };

  const mainPet = pets.length > 0 ? pets[0] : null;
  const nextReminder = getNextReminder();
  const nextVaccine = vaccines.length > 0 ? vaccines[0] : null;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B7FA8" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🐾 NALA</Text>
        <Text style={styles.headerSubtitle}>Bienvenido de vuelta</Text>
      </View>

      {/* Mascota Principal */}
      {mainPet ? (
        <TouchableOpacity
          style={styles.mainPetCard}
          onPress={() => router.push('/mascotas')}
        >
          <View style={styles.petHeader}>
            {mainPet.photo ? (
              <Image source={{ uri: mainPet.photo }} style={styles.petPhoto} />
            ) : (
              <View style={styles.petPhotoPlaceholder}>
                <Text style={styles.petPhotoIcon}>🐾</Text>
              </View>
            )}
            <View style={styles.petInfo}>
              <Text style={styles.petName}>{mainPet.name}</Text>
              <Text style={styles.petType}>{mainPet.type}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#8B7FA8" />
          </View>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.addPetCard}
          onPress={() => router.push('/mascotas')}
        >
          <Ionicons name="add-circle-outline" size={48} color="#8B7FA8" />
          <Text style={styles.addPetText}>Registra tu primera mascota</Text>
        </TouchableOpacity>
      )}

      {/* Próximo Recordatorio */}
      {nextReminder && (
        <TouchableOpacity
          style={styles.reminderCard}
          onPress={() => router.push('/salud')}
        >
          <View style={styles.reminderIcon}>
            <Ionicons name="notifications" size={24} color="#FF9800" />
          </View>
          <View style={styles.reminderInfo}>
            <Text style={styles.reminderTitle}>Próximo Recordatorio</Text>
            <Text style={styles.reminderText} numberOfLines={2}>
              {nextReminder.title}
            </Text>
            <Text style={styles.reminderDate}>
              {formatDate(nextReminder.scheduledAt)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      )}

      {/* Próxima Vacuna */}
      {nextVaccine && (
        <TouchableOpacity
          style={styles.vaccineCard}
          onPress={() => router.push('/salud')}
        >
          <View style={styles.vaccineIcon}>
            <Ionicons name="medical" size={24} color="#4CAF50" />
          </View>
          <View style={styles.vaccineInfo}>
            <Text style={styles.vaccineTitle}>Próxima Vacuna</Text>
            <Text style={styles.vaccineText} numberOfLines={2}>
              {nextVaccine.name}
            </Text>
            {nextVaccine.nextDose && (
              <Text style={styles.vaccineDate}>
                {formatDate(nextVaccine.nextDose)}
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      )}

      {/* Botón Rápido: Consultar Veterinario */}
      <TouchableOpacity
        style={styles.consultButton}
        onPress={() => router.push('/consultar')}
      >
        <View style={styles.consultButtonContent}>
          <Ionicons name="chatbubbles" size={32} color="#FFFFFF" />
          <View style={styles.consultButtonText}>
            <Text style={styles.consultButtonTitle}>Consultar Veterinario</Text>
            <Text style={styles.consultButtonSubtitle}>
              Obtén ayuda profesional ahora
            </Text>
          </View>
        </View>
        <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Accesos Rápidos */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Accesos Rápidos</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/mascotas')}
          >
            <Ionicons name="paw" size={32} color="#8B7FA8" />
            <Text style={styles.quickActionText}>Mis Mascotas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/salud')}
          >
            <Ionicons name="medical" size={32} color="#8B7FA8" />
            <Text style={styles.quickActionText}>Historial de Salud</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/consultar')}
          >
            <Ionicons name="chatbubbles" size={32} color="#8B7FA8" />
            <Text style={styles.quickActionText}>Veterinarios</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/perfil')}
          >
            <Ionicons name="settings" size={32} color="#8B7FA8" />
            <Text style={styles.quickActionText}>Configuración</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 24,
    paddingTop: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#8B7FA8',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  mainPetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  petHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
  petInfo: {
    flex: 1,
  },
  petName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  petType: {
    fontSize: 14,
    color: '#666',
  },
  addPetCard: {
    backgroundColor: '#F0E6FF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E0D0FF',
    borderStyle: 'dashed',
  },
  addPetText: {
    fontSize: 16,
    color: '#8B7FA8',
    marginTop: 12,
    fontWeight: '500',
  },
  reminderCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  reminderIcon: {
    marginRight: 12,
  },
  reminderInfo: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  reminderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  reminderDate: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '500',
  },
  vaccineCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  vaccineIcon: {
    marginRight: 12,
  },
  vaccineInfo: {
    flex: 1,
  },
  vaccineTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  vaccineText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  vaccineDate: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  consultButton: {
    backgroundColor: '#8B7FA8',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  consultButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  consultButtonText: {
    marginLeft: 16,
    flex: 1,
  },
  consultButtonTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  consultButtonSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  quickActions: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    fontSize: 14,
    color: '#333',
    marginTop: 8,
    fontWeight: '500',
    textAlign: 'center',
  },
});

import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const OPTIONS = [
  {
    id: 'chat',
    title: 'Chat Guiado',
    subtitle: 'Asistente virtual de la app',
    icon: 'chatbubbles',
    color: '#8B7FA8',
    route: 'chat',
  },
  {
    id: 'veterinarios',
    title: 'Buscar Veterinarios',
    subtitle: 'Encuentra un profesional',
    icon: 'medical',
    color: '#4CAF50',
    route: 'veterinarios',
  },
  {
    id: 'consultas',
    title: 'Mis Consultas',
    subtitle: 'Ver historial de consultas',
    icon: 'document-text',
    color: '#2196F3',
    route: 'pacientes',
  },
];

export default function ConsultarScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💬 Consultar</Text>
        <Text style={styles.headerSubtitle}>
          ¿Necesitas ayuda? Elige una opción
        </Text>
      </View>

      {OPTIONS.map((option) => (
        <TouchableOpacity
          key={option.id}
          style={styles.optionCard}
          onPress={() => router.push(option.route)}
        >
          <View style={[styles.optionIcon, { backgroundColor: `${option.color}20` }]}>
            <Ionicons name={option.icon} size={32} color={option.color} />
          </View>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>{option.title}</Text>
            <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#999" />
        </TouchableOpacity>
      ))}
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
  },
  header: {
    marginBottom: 24,
    paddingTop: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
});

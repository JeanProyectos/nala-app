import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import * as api from '../../services/api';

export default function ConfigurarComisionScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentPercentage, setCurrentPercentage] = useState(15);
  const [newPercentage, setNewPercentage] = useState('15');

  useEffect(() => {
    // Verificar que es admin
    if (user?.role !== 'ADMIN') {
      Alert.alert('Acceso denegado', 'Solo administradores pueden acceder a esta sección.');
      router.back();
      return;
    }
    loadConfig();
  }, [user]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const config = await api.getPlatformConfig();
      const percentage = (config.platformFeePercentage * 100).toFixed(0);
      setCurrentPercentage(parseFloat(percentage));
      setNewPercentage(percentage);
    } catch (error) {
      console.error('Error cargando configuración:', error);
      Alert.alert('Error', error.message || 'No se pudo cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const percentage = parseFloat(newPercentage);
    
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      Alert.alert('Error', 'El porcentaje debe estar entre 0 y 100');
      return;
    }

    Alert.alert(
      'Confirmar cambio',
      `¿Estás seguro de cambiar la comisión de ${currentPercentage}% a ${percentage}%?\n\nEsta configuración afectará todas las consultas futuras.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              const percentageDecimal = percentage / 100; // Convertir a decimal (15% = 0.15)
              await api.updateCommission(percentageDecimal);
              setCurrentPercentage(percentage);
              Alert.alert('Éxito', 'Comisión actualizada correctamente', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (error) {
              console.error('Error actualizando comisión:', error);
              Alert.alert('Error', error.message || 'No se pudo actualizar la comisión');
            } finally {
              setSaving(false);
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
        <Text style={styles.loadingText}>Cargando configuración...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configurar Comisión</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>💰 Comisión de la Plataforma</Text>
          <Text style={styles.infoText}>
            Establece el porcentaje de comisión que recibirá la plataforma por cada consulta pagada.
          </Text>
        </View>

        <View style={styles.currentConfig}>
          <Text style={styles.currentLabel}>Comisión Actual</Text>
          <Text style={styles.currentValue}>{currentPercentage}%</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nuevo Porcentaje de Comisión (%)</Text>
          <TextInput
            style={styles.input}
            value={newPercentage}
            onChangeText={setNewPercentage}
            placeholder="15"
            keyboardType="numeric"
          />
          <Text style={styles.helperText}>
            Ingresa un valor entre 0 y 100 (ej: 15 para 15%, 20 para 20%)
          </Text>
        </View>

        <View style={styles.exampleBox}>
          <Text style={styles.exampleTitle}>Ejemplo de cálculo:</Text>
          <Text style={styles.exampleText}>
            Si una consulta cuesta $50,000 COP:
          </Text>
          <Text style={styles.exampleText}>
            • Comisión ({newPercentage || 0}%): ${((parseFloat(newPercentage) || 0) / 100 * 50000).toLocaleString('es-CO')} COP
          </Text>
          <Text style={styles.exampleText}>
            • Veterinario recibe: ${((1 - (parseFloat(newPercentage) || 0) / 100) * 50000).toLocaleString('es-CO')} COP
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>💾 Guardar Cambios</Text>
          )}
        </TouchableOpacity>
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
    width: 100,
  },
  backButtonText: {
    fontSize: 16,
    color: '#8B7FA8',
    fontWeight: '600',
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
    padding: 20,
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
  currentConfig: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#8B7FA8',
  },
  currentLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  currentValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#8B7FA8',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  exampleBox: {
    backgroundColor: '#FFF9E6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  exampleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  exampleText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: '#8B7FA8',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

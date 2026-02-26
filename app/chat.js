import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';

const CHAT_OPTIONS = [
  {
    id: 'register_pet',
    label: 'Registrar una mascota',
    icon: '🐾',
    action: 'navigate',
    path: '/mascota',
  },
  {
    id: 'my_pets',
    label: 'Ver mis mascotas',
    icon: '🐕',
    action: 'navigate',
    path: '/mascota',
  },
  {
    id: 'consult_vet',
    label: 'Consultar veterinario',
    icon: '👨‍⚕️',
    action: 'navigate',
    path: '/veterinarios',
  },
  {
    id: 'health_history',
    label: 'Ver historial de salud',
    icon: '💊',
    action: 'navigate',
    path: '/salud',
  },
  {
    id: 'reminders',
    label: 'Ver recordatorios',
    icon: '🔔',
    action: 'navigate',
    path: '/recordatorios',
  },
];

const SYSTEM_RESPONSES = {
  greeting: '¡Hola! 👋 Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?',
  after_option: 'Perfecto, te he redirigido. ¿Hay algo más en lo que pueda ayudarte?',
};

export default function ChatScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [showOptions, setShowOptions] = useState(true);

  useEffect(() => {
    // Mensaje de bienvenida inicial
    setMessages([
      {
        id: 1,
        type: 'system',
        content: SYSTEM_RESPONSES.greeting,
        timestamp: new Date(),
      },
    ]);
  }, []);

  const handleOptionPress = (option) => {
    // Agregar mensaje del usuario
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: option.label,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // Agregar respuesta del sistema
    setTimeout(() => {
      const systemMessage = {
        id: Date.now() + 1,
        type: 'system',
        content: SYSTEM_RESPONSES.after_option,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, systemMessage]);
      setShowOptions(true);
    }, 500);

    // Navegar a la pantalla correspondiente
    if (option.action === 'navigate') {
      setTimeout(() => {
        router.push(option.path);
      }, 1000);
    }
  };

  const renderMessage = (message) => {
    const isSystem = message.type === 'system';
    return (
      <View
        key={message.id}
        style={[
          styles.messageContainer,
          isSystem ? styles.systemMessage : styles.userMessage,
        ]}
      >
        {isSystem && (
          <View style={styles.avatarContainer}>
            <Text style={styles.avatar}>🤖</Text>
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isSystem ? styles.systemBubble : styles.userBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isSystem ? styles.systemText : styles.userText,
            ]}
          >
            {message.content}
          </Text>
        </View>
        {!isSystem && (
          <View style={styles.avatarContainer}>
            <Text style={styles.avatar}>👤</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.map(renderMessage)}

        {showOptions && (
          <View style={styles.optionsContainer}>
            <Text style={styles.optionsTitle}>Selecciona una opción:</Text>
            {CHAT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.optionButton}
                onPress={() => handleOptionPress(option)}
              >
                <Text style={styles.optionIcon}>{option.icon}</Text>
                <Text style={styles.optionText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 100,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  systemMessage: {
    justifyContent: 'flex-start',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  avatar: {
    fontSize: 20,
  },
  messageBubble: {
    maxWidth: '70%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  systemBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: '#8B7FA8',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  systemText: {
    color: '#333',
  },
  userText: {
    color: '#FFFFFF',
  },
  optionsContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  optionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#F0E6FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0D0FF',
  },
  optionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  optionText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
});

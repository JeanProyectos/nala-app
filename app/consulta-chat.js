import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as api from '../services/api';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ConsultaChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const consultationId = parseInt(id);
  
  const [consultation, setConsultation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [socket, setSocket] = useState(null);
  const scrollViewRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    loadConsultation();
    connectToSocket();

    return () => {
      if (socket) {
        socket.emit('leave_consultation', { consultationId });
        disconnectSocket();
      }
    };
  }, []);

  const loadConsultation = async () => {
    try {
      const data = await api.getConsultation(consultationId);
      setConsultation(data);
      setMessages(data.messages || []);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar la consulta');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const connectToSocket = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const newSocket = await connectSocket(token);
      setSocket(newSocket);

      // Unirse a la sala de consulta
      newSocket.emit('join_consultation', { consultationId });

      // Escuchar historial de mensajes
      newSocket.on('message_history', (history) => {
        setMessages(history);
        scrollToBottom();
      });

      // Escuchar nuevos mensajes
      newSocket.on('new_message', (message) => {
        setMessages((prev) => [...prev, message]);
        scrollToBottom();
      });

      // Escuchar indicador de escritura
      newSocket.on('user_typing', (data) => {
        setOtherUserTyping(data.isTyping);
      });

      // Escuchar errores
      newSocket.on('error', (error) => {
        Alert.alert('Error', error.message);
      });
    } catch (error) {
      console.error('Error conectando socket:', error);
      Alert.alert('Error', 'No se pudo conectar al chat en tiempo real');
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !socket) return;

    try {
      setSending(true);
      socket.emit('send_message', {
        consultationId,
        content: messageText.trim(),
      });
      setMessageText('');
      setIsTyping(false);
    } catch (error) {
      Alert.alert('Error', 'No se pudo enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (text) => {
    setMessageText(text);
    
    if (!isTyping && text.length > 0) {
      setIsTyping(true);
      socket?.emit('typing', { consultationId, isTyping: true });
    }

    // Limpiar timeout anterior
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Si el usuario deja de escribir por 1 segundo, enviar evento
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket?.emit('typing', { consultationId, isTyping: false });
    }, 1000);
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const getSenderName = (message) => {
    if (message.senderType === 'vet') {
      return consultation?.veterinarian?.fullName || 'Veterinario';
    }
    return consultation?.user?.name || 'Tú';
  };

  const isMyMessage = (message) => {
    return message.senderType === 'user';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B7FA8" />
      </View>
    );
  }

  if (!consultation) {
    return null;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>
            {consultation.veterinarian?.fullName || 'Veterinario'}
          </Text>
          <Text style={styles.headerType}>
            {consultation.type === 'CHAT' && '💬 Chat'}
            {consultation.type === 'VOICE' && '📞 Llamada'}
            {consultation.type === 'VIDEO' && '📹 Videollamada'}
          </Text>
        </View>
        <View style={styles.statusIndicator}>
          <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
        </View>
      </View>

      {/* Mensajes */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={scrollToBottom}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageContainer,
              isMyMessage(message) ? styles.myMessage : styles.otherMessage,
            ]}
          >
            {!isMyMessage(message) && (
              <View style={styles.avatarContainer}>
                <Text style={styles.avatar}>👨‍⚕️</Text>
              </View>
            )}
            <View
              style={[
                styles.messageBubble,
                isMyMessage(message) ? styles.myBubble : styles.otherBubble,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  isMyMessage(message) ? styles.myText : styles.otherText,
                ]}
              >
                {message.content}
              </Text>
              <Text
                style={[
                  styles.messageTime,
                  isMyMessage(message) ? styles.myTime : styles.otherTime,
                ]}
              >
                {new Date(message.createdAt).toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
            {isMyMessage(message) && (
              <View style={styles.avatarContainer}>
                <Text style={styles.avatar}>👤</Text>
              </View>
            )}
          </View>
        ))}
        {otherUserTyping && (
          <View style={[styles.messageContainer, styles.otherMessage]}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatar}>👨‍⚕️</Text>
            </View>
            <View style={[styles.messageBubble, styles.otherBubble]}>
              <Text style={styles.typingText}>escribiendo...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Escribe un mensaje..."
          value={messageText}
          onChangeText={handleTyping}
          multiline
          placeholderTextColor="#999"
        />
        <TouchableOpacity
          style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!messageText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.sendButtonText}>➤</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    fontSize: 24,
    color: '#8B7FA8',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerType: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusIndicator: {
    marginLeft: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  myMessage: {
    justifyContent: 'flex-end',
  },
  otherMessage: {
    justifyContent: 'flex-start',
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
  myBubble: {
    backgroundColor: '#8B7FA8',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myText: {
    color: '#FFFFFF',
  },
  otherText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
  },
  myTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherTime: {
    color: '#999',
  },
  typingText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    fontSize: 15,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8B7FA8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
  },
});

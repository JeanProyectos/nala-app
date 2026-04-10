import { useState, useEffect, useRef, useCallback } from 'react';
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
  SafeAreaView,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as api from '../../../services/api';
import { connectSocket, disconnectSocket, getSocket, reconnectSocket } from '../../../services/socket';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SHADOWS } from '../../../styles/theme';
import StarRating from '../../../components/StarRating';

export default function ConsultaChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const rawConsultationId = Array.isArray(id) ? id[0] : id;
  const consultationId = parseInt(String(rawConsultationId ?? ''), 10);
  
  const [consultation, setConsultation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [socket, setSocket] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [paymentLocked, setPaymentLocked] = useState(false);
  const [paymentApprovedMessage, setPaymentApprovedMessage] = useState('');
  const [incomingCall, setIncomingCall] = useState(null);
  const [outgoingCall, setOutgoingCall] = useState(null);
  const [appAlert, setAppAlert] = useState(null);
  const scrollViewRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const paymentTimerRef = useRef(null);
  const paymentAlertShownRef = useRef(false);
  const paymentApprovedAlertShownRef = useRef(false);
  const expiredAlertShownRef = useRef(false);
  const rejectedAlertShownRef = useRef(false);
  const currentUserRoleRef = useRef(null);
  const currentUserIdRef = useRef(null);
  const paymentLockedRef = useRef(false);
  const incomingCallRef = useRef(null);
  const outgoingCallRef = useRef(null);
  const navigatingToCallRef = useRef(false);
  const callFlowLockedRef = useRef(false);

  const hasApprovedPayment = (data) => data?.payment?.status === 'APPROVED';

  const requiresPaymentNow = (data, role = currentUserRole) => {
    if (!data || role !== 'USER') {
      return false;
    }

    if (hasApprovedPayment(data) || data.status !== 'IN_PROGRESS' || !data.startDate) {
      return false;
    }

    return Date.now() - new Date(data.startDate).getTime() >= 2 * 60 * 1000;
  };

  const openPaymentScreen = () => {
    router.push(`/(tabs)/consultar/pago-consulta?id=${consultationId}`);
  };

  const handleDeclinePaymentAndFinish = async () => {
    try {
      await api.finishConsultation(consultationId, false, { reason: 'USER_DECLINED_PAYMENT' });
      const activeSocket = socket || getSocket();
      if (activeSocket?.connected) {
        activeSocket.emit('call_end', {
          consultationId,
          reason: 'USER_DECLINED_PAYMENT',
        });
        activeSocket.emit('leave_consultation', { consultationId });
      }
      router.replace('/(tabs)/consultar/pacientes');
      showAppAlert({
        title: 'Consulta finalizada',
        message: 'Decidiste no pagar. La consulta se cerró y el veterinario fue notificado.',
        variant: 'info',
      });
    } catch (error) {
      showAppAlert({
        title: 'Error',
        message: error.message || 'No se pudo finalizar la consulta',
        variant: 'error',
      });
    }
  };

  const getCallLabel = (type) => (type === 'VOICE' ? 'llamada' : 'videollamada');

  const showAppAlert = ({ title, message, variant = 'info', actions }) => {
    setAppAlert({
      title,
      message,
      variant,
      actions: actions?.length ? actions : [{ text: 'OK' }],
    });
  };

  const closeAppAlert = (action) => {
    setAppAlert(null);
    if (action?.onPress) {
      setTimeout(() => action.onPress(), 0);
    }
  };

  const getOtherParticipantName = () => {
    if (currentUserRoleRef.current === 'VET') {
      return consultation?.user?.name || 'el cliente';
    }
    return consultation?.veterinarian?.fullName || 'el veterinario';
  };

  const openCallScreen = (type, initiator) => {
    if (navigatingToCallRef.current) {
      return;
    }

    navigatingToCallRef.current = true;
    callFlowLockedRef.current = true;
    setIncomingCall(null);
    setOutgoingCall(null);
    router.push(
      `/(tabs)/consultar/video-call?id=${consultationId}&type=${type}&initiator=${initiator ? '1' : '0'}`
    );
  };

  useFocusEffect(
    useCallback(() => {
      // Al volver del screen de llamada, reabrimos el flujo para próximas llamadas.
      navigatingToCallRef.current = false;
      callFlowLockedRef.current = false;
      return undefined;
    }, [])
  );

  const activatePaymentLock = () => {
    setPaymentLocked(true);

    if (paymentAlertShownRef.current) {
      return;
    }

    paymentAlertShownRef.current = true;
    showAppAlert({
      title: 'Pago requerido',
      message: 'Ya pasaron 2 minutos de la consulta. Debes pagar para continuar.',
      variant: 'warning',
      actions: [
        {
          text: 'No pagar y finalizar',
          style: 'cancel',
          onPress: handleDeclinePaymentAndFinish,
        },
        {
          text: 'Ir a pagar',
          onPress: openPaymentScreen,
        },
      ],
    });
  };

  const applyPaymentApprovedState = (message) => {
    setPaymentLocked(false);
    paymentLockedRef.current = false;
    paymentAlertShownRef.current = false;
    setPaymentApprovedMessage(message);

    setConsultation((prev) => {
      if (!prev) {
        return prev;
      }

      return {
        ...prev,
        payment: {
          ...(prev.payment || {}),
          status: 'APPROVED',
        },
      };
    });
  };

  const notifyPaymentApproved = (message) => {
    applyPaymentApprovedState(message);

    if (!paymentApprovedAlertShownRef.current) {
      paymentApprovedAlertShownRef.current = true;
      showAppAlert({
        title: 'Pago exitoso',
        message,
        variant: 'success',
      });
    }
  };

  const schedulePaymentCheck = (data, role = currentUserRole) => {
    if (paymentTimerRef.current) {
      clearTimeout(paymentTimerRef.current);
      paymentTimerRef.current = null;
    }

    const mustPayNow = requiresPaymentNow(data, role);
    setPaymentLocked(mustPayNow);

    if (mustPayNow) {
      activatePaymentLock();
      return;
    }

    if (!data || role !== 'USER' || hasApprovedPayment(data) || data.status !== 'IN_PROGRESS' || !data.startDate) {
      paymentAlertShownRef.current = false;
      return;
    }

    const elapsedMs = Date.now() - new Date(data.startDate).getTime();
    const remainingMs = Math.max(2 * 60 * 1000 - elapsedMs, 0);

    paymentTimerRef.current = setTimeout(() => {
      activatePaymentLock();
    }, remainingMs);
  };

  useEffect(() => {
    loadConsultation();
    connectToSocket();

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (paymentTimerRef.current) {
        clearTimeout(paymentTimerRef.current);
      }
      if (navigatingToCallRef.current) {
        return;
      }
      const activeSocket = getSocket();
      if (activeSocket) {
        activeSocket.emit('leave_consultation', { consultationId });
      }
      disconnectSocket();
    };
  }, []);

  useEffect(() => {
    currentUserRoleRef.current = currentUserRole;
  }, [currentUserRole]);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    paymentLockedRef.current = paymentLocked;
  }, [paymentLocked]);

  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  useEffect(() => {
    outgoingCallRef.current = outgoingCall;
  }, [outgoingCall]);

  useEffect(() => {
    if (!consultation || !currentUserRole) {
      return undefined;
    }

    schedulePaymentCheck(consultation, currentUserRole);
    const interval = setInterval(() => loadConsultation(false), 15000);

    return () => {
      clearInterval(interval);
      if (paymentTimerRef.current) {
        clearTimeout(paymentTimerRef.current);
        paymentTimerRef.current = null;
      }
    };
  }, [consultation?.id, consultation?.status, consultation?.startDate, consultation?.payment?.status, currentUserRole]);

  const loadConsultation = async (showFatalError = true) => {
    try {
      const profile = await api.getProfile();
      const data = await api.getConsultation(consultationId);
      setCurrentUserId(profile?.id || null);
      setCurrentUserRole(profile?.role || null);
      setConsultation(data);
      setMessages(data.messages || []);
      schedulePaymentCheck(data, profile?.role || null);
      if (hasApprovedPayment(data)) {
        const message =
          (profile?.role || null) === 'VET'
            ? 'El cliente ya realizó el pago. Puedes continuar con la consulta.'
            : 'Tu pago fue aprobado. Ya puedes continuar con la consulta.';
        applyPaymentApprovedState(message);
      }

      // Si la consulta está expirada, mostrar mensaje
      if (data.status === 'EXPIRED' && !expiredAlertShownRef.current) {
        expiredAlertShownRef.current = true;
        showAppAlert({
          title: 'Consulta expirada',
          message: 'Esta consulta ha expirado. Por favor crea una nueva.',
          variant: 'warning',
          actions: [{ text: 'OK', onPress: () => router.back() }],
        });
        return;
      }

      // Si la consulta fue rechazada, mostrar mensaje
      if (data.status === 'REJECTED' && !rejectedAlertShownRef.current) {
        rejectedAlertShownRef.current = true;
        showAppAlert({
          title: 'Consulta rechazada',
          message: 'El veterinario ha rechazado esta consulta.',
          variant: 'error',
          actions: [{ text: 'OK', onPress: () => router.back() }],
        });
        return;
      }

      // Si está pendiente de aprobación, mostrar mensaje
      if (data.status === 'PENDING_APPROVAL') {
        // No hacer nada, el usuario puede ver el estado pero no puede chatear aún
      }

      // Si está finalizada y no pagada, mostrar opción de pago
      if (data.status === 'FINISHED' && !data.payment) {
        // La consulta terminó pero no se pagó, se puede pagar después
      }
    } catch (error) {
      console.error('Error cargando consulta:', error);
      if (showFatalError) {
        const errorMessage = error.message || 'No se pudo cargar la consulta';
        showAppAlert({
          title: 'Error del servidor',
          message: errorMessage,
          variant: 'error',
          actions: [{ text: 'OK', onPress: () => router.back() }],
        });
      }
    } finally {
      if (showFatalError) {
        setLoading(false);
      }
    }
  };

  const connectToSocket = async () => {
    try {
      if (!Number.isFinite(consultationId) || consultationId < 1) {
        showAppAlert({
          title: 'Error',
          message: 'ID de consulta no válido. Vuelve atrás y abre la consulta de nuevo.',
          variant: 'error',
        });
        return;
      }

      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.error('No hay token disponible');
        showAppAlert({ title: 'Error', message: 'No estás autenticado', variant: 'error' });
        return;
      }

      console.log('🔌 Conectando al socket...');
      const newSocket = await connectSocket(token);
      setSocket(newSocket);

      // Verificar que el socket está conectado
      if (!newSocket.connected) {
        console.error('Socket no está conectado');
        showAppAlert({ title: 'Error', message: 'No se pudo conectar al servidor', variant: 'error' });
        return;
      }

      console.log('✅ Socket conectado, uniéndose a consulta:', consultationId);

      // Unirse a la sala de consulta
      newSocket.emit('join_consultation', { consultationId }, (response) => {
        if (response && response.error) {
          console.error('Error al unirse a consulta:', response.error);
          showAppAlert({ title: 'Error', message: response.error, variant: 'error' });
        } else {
          console.log('✅ Unido a la consulta exitosamente');
        }
      });

      // Escuchar historial de mensajes
      newSocket.on('message_history', (history) => {
        console.log('📨 Historial recibido:', history?.length || 0, 'mensajes');
        setMessages(history || []);
        scrollToBottom();
      });

      // Escuchar nuevos mensajes
      newSocket.on('new_message', (message) => {
        console.log('💬 Nuevo mensaje recibido:', message);
        setMessages((prev) => [...prev, message]);
        scrollToBottom();
      });

      // Escuchar indicador de escritura
      newSocket.on('user_typing', (data) => {
        console.log('⌨️ Usuario escribiendo:', data);
        setOtherUserTyping(data.isTyping);
      });

      // La llamada no se abre sola al iniciar la consulta: solo cuando alguien pulsa
      // iniciar llamada (call_request) y la otra parte acepta (call_accept).

      newSocket.on('call_request', (data) => {
        if (callFlowLockedRef.current || navigatingToCallRef.current) {
          return;
        }

        if (data?.consultationId !== consultationId || data.from === currentUserIdRef.current) {
          return;
        }

        if (incomingCallRef.current || outgoingCallRef.current) {
          newSocket.emit('call_reject', {
            consultationId,
            from: data.from,
            type: data.type,
            reason: 'busy',
          });
          return;
        }

        setIncomingCall({
          from: data.from,
          type: data.type === 'VOICE' ? 'VOICE' : 'VIDEO',
        });
      });

      newSocket.on('call_accept', (data) => {
        if (callFlowLockedRef.current || navigatingToCallRef.current) {
          return;
        }

        if (data?.consultationId !== consultationId || data.to !== currentUserIdRef.current) {
          return;
        }

        const callType = data.type || outgoingCallRef.current?.type || consultation?.type || 'VIDEO';
        openCallScreen(callType, true);
      });

      newSocket.on('call_reject', (data) => {
        if (callFlowLockedRef.current || navigatingToCallRef.current || !outgoingCallRef.current) {
          return;
        }

        if (data?.consultationId !== consultationId || data.to !== currentUserIdRef.current) {
          return;
        }

        setOutgoingCall(null);
        const message =
          data.reason === 'busy'
            ? 'La otra persona ya está ocupada en otra llamada.'
            : 'La otra persona rechazó la llamada.';
        showAppAlert({ title: 'Llamada rechazada', message, variant: 'warning' });
      });

      newSocket.on('payment_required', (data) => {
        if (data?.consultationId === consultationId) {
          activatePaymentLock();
        }
      });

      newSocket.on('payment_updated', (data) => {
        if (data?.consultationId !== consultationId || data?.status !== 'APPROVED') {
          return;
        }

        const message =
          currentUserRoleRef.current === 'VET'
            ? 'El cliente ya realizó el pago. Puedes continuar con la consulta.'
            : 'Tu pago fue aprobado. Ya puedes continuar con la consulta.';

        notifyPaymentApproved(message);
        loadConsultation(false);
      });

      // Escuchar errores
      newSocket.on('error', (error) => {
        console.error('❌ Error en socket:', error);
        showAppAlert({
          title: 'Error',
          message: error.message || 'Error en la conexión',
          variant: 'error',
        });
      });

      // Escuchar desconexión
      newSocket.on('disconnect', (reason) => {
        console.warn('⚠️ Socket desconectado:', reason);
        if (reason === 'io server disconnect') {
          showAppAlert({
            title: 'Desconectado',
            message: 'El servidor cerró la conexión',
            variant: 'warning',
          });
        }
      });

      newSocket.on('call_end', (data) => {
        if (data?.consultationId !== consultationId) {
          return;
        }

        // Siempre liberar el flujo para poder iniciar otra llamada después.
        callFlowLockedRef.current = false;
        navigatingToCallRef.current = false;

        if (data.from === currentUserIdRef.current) {
          return;
        }

        const hadIncoming = !!incomingCallRef.current;
        const hadOutgoing = !!outgoingCallRef.current;
        setIncomingCall(null);
        setOutgoingCall(null);

        if (hadIncoming) {
          showAppAlert({
            title: 'Llamada cancelada',
            message: 'La otra persona canceló la llamada.',
            variant: 'warning',
          });
        } else if (hadOutgoing) {
          showAppAlert({
            title: 'Llamada finalizada',
            message: 'La otra persona finalizó la llamada.',
            variant: 'info',
          });
        }
      });

      newSocket.on('consultation_ended_no_payment', (data) => {
        if (data?.consultationId !== consultationId) {
          return;
        }

        setIncomingCall(null);
        setOutgoingCall(null);
        setPaymentLocked(true);

        if (currentUserRoleRef.current === 'VET') {
          showAppAlert({
            title: 'Consulta finalizada',
            message: 'El usuario decidió no pagar. La consulta fue cerrada.',
            variant: 'warning',
          });
        }
      });

      // Escuchar reconexión
      newSocket.on('reconnect', () => {
        console.log('🔄 Reconectado, reuniéndose a consulta');
        newSocket.emit('join_consultation', { consultationId });
      });
    } catch (error) {
      console.error('❌ Error conectando socket:', error);
      showAppAlert({
        title: 'Error',
        message: 'No se pudo conectar al chat en tiempo real',
        variant: 'error',
      });
    }
  };

  const ensureSocketConnected = async () => {
    const activeSocket = socket || getSocket();
    if (activeSocket?.connected) {
      return activeSocket;
    }

    const reconnectedSocket = await reconnectSocket();
    if (reconnectedSocket?.connected) {
      setSocket(reconnectedSocket);
      reconnectedSocket.emit('join_consultation', { consultationId });
      return reconnectedSocket;
    }

    return null;
  };

  const requestCall = async (callType) => {
    if (paymentLocked && currentUserRole === 'USER') {
      activatePaymentLock();
      return;
    }

    const activeSocket = await ensureSocketConnected();
    if (!activeSocket) {
      showAppAlert({ title: 'Error', message: 'No hay conexión al servidor', variant: 'error' });
      return;
    }

    if (incomingCall || outgoingCall) {
      showAppAlert({
        title: 'Llamada en curso',
        message: 'Ya tienes una llamada pendiente en esta consulta.',
        variant: 'info',
      });
      return;
    }

    const normalizedType = callType === 'VOICE' ? 'VOICE' : 'VIDEO';
    setOutgoingCall({ type: normalizedType });
    activeSocket.emit('call_request', {
      consultationId,
      type: normalizedType,
    });
  };

  const cancelOutgoingCall = () => {
    if (!socket || !outgoingCallRef.current) {
      return;
    }

    socket.emit('call_end', {
      consultationId,
      type: outgoingCallRef.current.type,
      reason: 'cancelled',
    });
    callFlowLockedRef.current = false;
    setOutgoingCall(null);
  };

  const rejectIncomingCall = () => {
    if (!socket || !incomingCallRef.current) {
      callFlowLockedRef.current = false;
      setIncomingCall(null);
      return;
    }

    socket.emit('call_reject', {
      consultationId,
      from: incomingCallRef.current.from,
      type: incomingCallRef.current.type,
      reason: 'rejected',
    });
    callFlowLockedRef.current = false;
    setIncomingCall(null);
  };

  const acceptIncomingCall = async () => {
    if (paymentLocked && currentUserRole === 'USER') {
      activatePaymentLock();
      return;
    }

    const activeSocket = await ensureSocketConnected();
    if (!activeSocket || !incomingCallRef.current) {
      showAppAlert({ title: 'Error', message: 'No hay conexión al servidor', variant: 'error' });
      return;
    }

    activeSocket.emit('call_accept', {
      consultationId,
      from: incomingCallRef.current.from,
      type: incomingCallRef.current.type,
    });
    callFlowLockedRef.current = true;
    openCallScreen(incomingCallRef.current.type, false);
  };

  const sendMessage = async () => {
    if (!messageText.trim()) {
      console.warn('Intento de enviar mensaje vacío');
      return;
    }

    if (paymentLocked && currentUserRole === 'USER') {
      activatePaymentLock();
      return;
    }

    const activeSocket = await ensureSocketConnected();
    if (!activeSocket) {
      console.error('Socket no disponible');
      showAppAlert({ title: 'Error', message: 'No hay conexión al servidor', variant: 'error' });
      return;
    }

    try {
      setSending(true);
      const messageContent = messageText.trim();
      console.log('📤 Enviando mensaje:', messageContent);
      
      activeSocket.emit('send_message', {
        consultationId,
        content: messageContent,
      });

      // Escuchar confirmación
      const confirmListener = (data) => {
        if (data.success) {
          console.log('✅ Mensaje enviado exitosamente');
          setMessageText('');
          setIsTyping(false);
          activeSocket.off('message_sent', confirmListener);
        }
        setSending(false);
      };

      activeSocket.on('message_sent', confirmListener);

      // Timeout de seguridad
      setTimeout(() => {
        activeSocket.off('message_sent', confirmListener);
        setSending(false);
      }, 5000);

      // El estado se actualizará en el callback o en el catch
    } catch (error) {
      console.error('❌ Error enviando mensaje:', error);
      showAppAlert({ title: 'Error', message: 'No se pudo enviar el mensaje', variant: 'error' });
      setSending(false);
    }
  };

  const handleTyping = (text) => {
    if (paymentLocked && currentUserRole === 'USER') {
      activatePaymentLock();
      return;
    }

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
    if (currentUserRole === 'VET') {
      return message.senderType === 'vet';
    }
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
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
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
        {/* Llamadas: coincide con gateway (PENDING_APPROVAL | IN_PROGRESS | PAID). */}
        {(consultation.status === 'IN_PROGRESS' ||
          consultation.status === 'PAID' ||
          consultation.status === 'PENDING_APPROVAL') && (
          <View style={styles.callButtons}>
            {consultation.type === 'VOICE' || consultation.type === 'VIDEO' ? (
              <TouchableOpacity
                style={[styles.callButton, paymentLocked && currentUserRole === 'USER' && styles.callButtonDisabled]}
                onPress={() => {
                  requestCall(consultation.type);
                }}
                disabled={paymentLocked || !!incomingCall || !!outgoingCall}
              >
                <Ionicons 
                  name={consultation.type === 'VIDEO' ? 'videocam' : 'call'} 
                  size={24} 
                  color={COLORS.textWhite} 
                />
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </View>

      {consultation.status === 'PENDING_APPROVAL' && (
        <View style={styles.paymentBanner}>
          <Text style={styles.paymentBannerText}>
            Esperando la aprobación del veterinario para iniciar la consulta.
          </Text>
        </View>
      )}

      {paymentLocked && currentUserRole === 'USER' && (
        <View style={styles.paymentBanner}>
          <Text style={styles.paymentBannerText}>
            Debes pagar la consulta para seguir escribiendo o continuar la llamada.
          </Text>
        </View>
      )}

      {!!paymentApprovedMessage && (
        <View style={styles.successBanner}>
          <Text style={styles.successBannerText}>{paymentApprovedMessage}</Text>
        </View>
      )}

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
          placeholder={paymentLocked && currentUserRole === 'USER' ? 'Debes pagar para continuar...' : 'Escribe un mensaje...'}
          value={messageText}
          onChangeText={handleTyping}
          multiline
          placeholderTextColor="#999"
          editable={!paymentLocked && consultation.status !== 'PENDING_APPROVAL'}
        />
        <TouchableOpacity
          style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!messageText.trim() || sending || paymentLocked || consultation.status === 'PENDING_APPROVAL'}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.sendButtonText}>➤</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Botón finalizar consulta */}
      {(consultation.status === 'PENDING_PAYMENT' || consultation.status === 'IN_PROGRESS' || consultation.status === 'PENDING_APPROVAL') && (
        <View style={styles.finishContainer}>
          <TouchableOpacity
            style={[styles.finishButton, paymentLocked && currentUserRole === 'USER' && styles.finishButtonDisabled]}
            onPress={async () => {
              try {
                if (paymentLocked && currentUserRole === 'USER') {
                  activatePaymentLock();
                  return;
                }
                await api.finishConsultation(consultationId, false);
                // ✅ Mostrar modal de calificación después de finalizar
                setShowRatingModal(true);
              } catch (error) {
                showAppAlert({
                  title: 'Error',
                  message: error.message || 'No se pudo finalizar la consulta',
                  variant: 'error',
                });
              }
            }}
          >
            <Text style={styles.finishButtonText}>✅ Finalizar Consulta</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ✅ Modal de Calificación */}
      <Modal
        visible={!!appAlert}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAppAlert(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.appAlertContent}>
            <View
              style={[
                styles.appAlertIcon,
                appAlert?.variant === 'success' && styles.appAlertIconSuccess,
                appAlert?.variant === 'warning' && styles.appAlertIconWarning,
                appAlert?.variant === 'error' && styles.appAlertIconError,
              ]}
            >
              <Ionicons
                name={
                  appAlert?.variant === 'success'
                    ? 'checkmark'
                    : appAlert?.variant === 'warning'
                      ? 'alert'
                      : appAlert?.variant === 'error'
                        ? 'close'
                        : 'information'
                }
                size={28}
                color="#FFFFFF"
              />
            </View>
            <Text style={styles.modalTitle}>{appAlert?.title}</Text>
            <Text style={styles.modalSubtitle}>{appAlert?.message}</Text>
            <View style={styles.appAlertButtons}>
              {(appAlert?.actions || []).map((action, index) => (
                <TouchableOpacity
                  key={`${action.text}-${index}`}
                  style={[
                    styles.modalButton,
                    action.style === 'cancel' ? styles.modalButtonCancel : styles.modalButtonSubmit,
                    (appAlert?.actions?.length || 0) === 1 && styles.appAlertSingleButton,
                  ]}
                  onPress={() => closeAppAlert(action)}
                >
                  <Text
                    style={
                      action.style === 'cancel'
                        ? styles.modalButtonTextCancel
                        : styles.modalButtonTextSubmit
                    }
                  >
                    {action.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!incomingCall || !!outgoingCall}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.callModalContent}>
            <View style={styles.callModalIcon}>
              <Ionicons
                name={(incomingCall?.type || outgoingCall?.type) === 'VIDEO' ? 'videocam' : 'call'}
                size={28}
                color="#FFFFFF"
              />
            </View>
            <Text style={styles.modalTitle}>
              {incomingCall
                ? `${(incomingCall.type === 'VIDEO' ? 'Videollamada' : 'Llamada')} entrante`
                : `Llamando por ${getCallLabel(outgoingCall?.type)}`}
            </Text>
            <Text style={styles.modalSubtitle}>
              {incomingCall
                ? `${getOtherParticipantName()} quiere iniciar una ${getCallLabel(incomingCall.type)} contigo.`
                : `Esperando que ${getOtherParticipantName()} acepte la ${getCallLabel(outgoingCall?.type)}.`}
            </Text>

            <View style={styles.modalButtons}>
              {incomingCall ? (
                <>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonCancel]}
                    onPress={rejectIncomingCall}
                  >
                    <Text style={styles.modalButtonTextCancel}>Rechazar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.callAcceptButton]}
                    onPress={acceptIncomingCall}
                  >
                    <Text style={styles.modalButtonTextSubmit}>Unirse</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.modalButton, styles.endPendingCallButton]}
                  onPress={cancelOutgoingCall}
                >
                  <Text style={styles.modalButtonTextSubmit}>Cancelar llamada</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showRatingModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRatingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Califica al Veterinario</Text>
            <Text style={styles.modalSubtitle}>
              ¿Cómo fue tu experiencia con {consultation?.veterinarian?.fullName || 'el veterinario'}?
            </Text>
            
            <View style={styles.ratingContainer}>
              <StarRating
                rating={rating}
                onRatingChange={setRating}
                editable={true}
                size={40}
              />
            </View>

            <TextInput
              style={styles.commentInput}
              placeholder="Comentario opcional..."
              placeholderTextColor={COLORS.textTertiary}
              value={ratingComment}
              onChangeText={setRatingComment}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowRatingModal(false);
                  setRating(0);
                  setRatingComment('');
                    showAppAlert({
                      title: 'Consulta finalizada',
                      message: 'La consulta ha finalizado. Puedes calificar después.',
                      variant: 'info',
                    });
                }}
              >
                <Text style={styles.modalButtonTextCancel}>Omitir</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSubmit, rating === 0 && styles.modalButtonDisabled]}
                onPress={async () => {
                  if (rating === 0) {
                    showAppAlert({
                      title: 'Error',
                      message: 'Por favor selecciona una calificación',
                      variant: 'error',
                    });
                    return;
                  }
                  
                  try {
                    await api.rateConsultation(consultationId, {
                      rating,
                      comment: ratingComment.trim() || undefined,
                    });
                    
                    setShowRatingModal(false);
                    setRating(0);
                    setRatingComment('');
                    
                    showAppAlert({
                      title: 'Gracias',
                      message: 'Tu calificación ha sido registrada. La consulta quedó finalizada.',
                      variant: 'success',
                    });
                    
                    // Recargar consulta para ver la calificación
                    loadConsultation();
                  } catch (error) {
                    showAppAlert({
                      title: 'Error',
                      message: error.message || 'No se pudo enviar la calificación',
                      variant: 'error',
                    });
                  }
                }}
                disabled={rating === 0}
              >
                <Text style={styles.modalButtonTextSubmit}>Enviar Calificación</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
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
  paymentBanner: {
    backgroundColor: '#FFF9E6',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  paymentBannerText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
  },
  successBanner: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#C8E6C9',
  },
  successBannerText: {
    fontSize: 14,
    color: '#2E7D32',
    textAlign: 'center',
    fontWeight: '600',
  },
  paymentPendingText: {
    fontSize: 12,
    color: '#FF9800',
    marginTop: 4,
  },
  finishContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  finishButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  finishButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  finishButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  callButtons: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.accentGreen,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  callButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  // ✅ Estilos del modal de calificación
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    ...SHADOWS.lg,
  },
  callModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '88%',
    maxWidth: 380,
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  appAlertContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '88%',
    maxWidth: 380,
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  appAlertIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#8B7FA8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appAlertIconSuccess: {
    backgroundColor: COLORS.accentGreen,
  },
  appAlertIconWarning: {
    backgroundColor: '#F59E0B',
  },
  appAlertIconError: {
    backgroundColor: COLORS.accentRed,
  },
  callModalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#8B7FA8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 100,
    marginBottom: 24,
    backgroundColor: '#F8F8F8',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  appAlertButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F0F0F0',
  },
  modalButtonSubmit: {
    backgroundColor: '#8B7FA8',
  },
  appAlertSingleButton: {
    flex: 0,
    minWidth: 140,
  },
  callAcceptButton: {
    backgroundColor: COLORS.accentGreen,
  },
  endPendingCallButton: {
    flex: 1,
    backgroundColor: COLORS.accentRed,
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalButtonTextCancel: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextSubmit: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

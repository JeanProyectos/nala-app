import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { connectSocket } from '../services/socket';
import * as api from '../services/api';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../styles/theme';
import { appendCallLog, clearCallLog, readCallLog } from '../utils/callDiagnostics';

let RTCView, mediaDevices, RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, MediaStream;
let InCallManager;

try {
  const WebRTC = require('react-native-webrtc');
  RTCView = WebRTC.RTCView;
  mediaDevices = WebRTC.mediaDevices;
  RTCPeerConnection = WebRTC.RTCPeerConnection;
  RTCSessionDescription = WebRTC.RTCSessionDescription;
  RTCIceCandidate = WebRTC.RTCIceCandidate;
  MediaStream = WebRTC.MediaStream;
} catch (error) {
  console.warn('react-native-webrtc no está instalado. Las videollamadas no funcionarán.');
  RTCView = View;
  mediaDevices = null;
  RTCPeerConnection = null;
  RTCSessionDescription = null;
  RTCIceCandidate = null;
  MediaStream = null;
}

try {
  InCallManager = require('react-native-incall-manager').default;
} catch (error) {
  InCallManager = null;
}

export default function VideoCallScreen() {
  const router = useRouter();
  const { id, type, initiator, name } = useLocalSearchParams();
  const consultationId = parseInt(id, 10);
  const callType = type || 'VIDEO';
  const isInitiator = initiator === '1' || initiator === 'true' || initiator === true;
  const contactName = name || 'Patas y Pelos';

  const [callState, setCallState] = useState('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'VIDEO');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentLocked, setPaymentLocked] = useState(false);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);

  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const remoteMediaStreamRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);
  const currentUserRoleRef = useRef(null);
  const currentUserIdRef = useRef(null);
  const paymentTimerRef = useRef(null);
  const paymentAlertShownRef = useRef(false);
  const paymentLockedRef = useRef(false);
  const offerStartedRef = useRef(false);
  const mountedRef = useRef(true);
  const callReadyIntervalRef = useRef(null);
  const relayFallbackTimeoutRef = useRef(null);
  const joinFallbackTimeoutRef = useRef(null);
  const socketListenersCleanupRef = useRef(null);
  const joinConfirmedRef = useRef(false);
  const durationTimerRef = useRef(null);

  const logCall = (level, message, payload) => {
    appendCallLog(level, `[consultation:${consultationId}] ${message}`, payload);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  useEffect(() => {
    // Log explícito para diagnosticar condiciones de glare
    // eslint-disable-next-line no-console
    console.log('IS_INITIATOR:', isInitiator);
  }, [isInitiator]);

  const serializeSessionDescription = (description) => {
    if (!description) {
      return description;
    }
    if (typeof description.toJSON === 'function') {
      return description.toJSON();
    }
    return {
      type: description.type,
      sdp: description.sdp,
    };
  };

  const serializeIceCandidate = (candidate) => {
    if (!candidate) {
      return candidate;
    }
    if (typeof candidate.toJSON === 'function') {
      return candidate.toJSON();
    }
    return {
      candidate: candidate.candidate,
      sdpMid: candidate.sdpMid,
      sdpMLineIndex: candidate.sdpMLineIndex,
      usernameFragment: candidate.usernameFragment,
    };
  };

  const flushLogsToApi = async (reason) => {
    try {
      const rawLogText = await readCallLog();
      const logText = rawLogText?.length > 45000 ? rawLogText.slice(-45000) : rawLogText;
      if (!logText) return;

      await api.uploadVideoCallDiagnostics({
        consultationId,
        logText,
        platform: Platform.OS,
        appVersion: 'nala-app',
        sentAt: new Date().toISOString(),
        reason,
      });
      logCall('INFO', 'Log flushed to API', { reason });
    } catch (error) {
      console.warn('No se pudo enviar log de videollamada al backend:', error?.message || error);
    }
  };

  const defaultIceConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      // TURN público (puede tener límites, pero sirve como fallback)
      {
        urls: [
          'turn:openrelay.metered.ca:80',
          'turn:openrelay.metered.ca:443',
          'turn:openrelay.metered.ca:443?transport=tcp',
        ],
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      // TURN alternativo (solo TCP) para redes móviles estrictas
      {
        urls: [
          'turn:global.relay.metered.ca:80?transport=tcp',
          'turn:global.relay.metered.ca:443?transport=tcp',
        ],
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
    ],
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
  };

  const relayOnlyIceConfig = {
    ...defaultIceConfig,
    iceTransportPolicy: 'relay',
  };

  const hasApprovedPayment = (data) => data?.payment?.status === 'APPROVED';

  const requiresPaymentNow = (data, role = currentUserRoleRef.current) => {
    if (!data || role !== 'USER') {
      return false;
    }

    if (hasApprovedPayment(data) || data.status !== 'IN_PROGRESS' || !data.startDate) {
      return false;
    }

    return Date.now() - new Date(data.startDate).getTime() >= 2 * 60 * 1000;
  };

  const stopStream = (stream) => {
    if (!stream) {
      return;
    }

    stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch (error) {
        console.warn('No se pudo detener track', error);
      }
    });
  };

  const cleanupPeerConnection = () => {
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    pendingIceCandidatesRef.current = [];
    offerStartedRef.current = false;
  };

  const cleanupMedia = () => {
    stopStream(localStreamRef.current);
    stopStream(remoteStreamRef.current);
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    remoteMediaStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
  };

  /** Solo quita listeners de esta pantalla; no usar removeAllListeners (socket compartido con el chat). */
  const detachCallSocketListeners = () => {
    socketListenersCleanupRef.current?.();
    socketListenersCleanupRef.current = null;
  };

  const ensureMediaPermissions = async () => {
    if (Platform.OS !== 'android') {
      return true;
    }

    const permissions = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
    if (callType === 'VIDEO') {
      permissions.push(PermissionsAndroid.PERMISSIONS.CAMERA);
    }

    const results = await PermissionsAndroid.requestMultiple(permissions);
    const deniedPermissions = permissions.filter(
      (permission) => results[permission] !== PermissionsAndroid.RESULTS.GRANTED
    );

    if (deniedPermissions.length > 0) {
      logCall('WARN', 'Media permissions denied', deniedPermissions);
      throw new Error(
        callType === 'VIDEO'
          ? 'Debes permitir camara y microfono para iniciar la videollamada.'
          : 'Debes permitir el microfono para iniciar la llamada.'
      );
    }

    logCall('INFO', 'Media permissions granted', { callType });
    return true;
  };

  const leaveCall = (navigateToPayment = false) => {
    logCall('INFO', 'leaveCall invoked', { navigateToPayment });
    flushLogsToApi('leaveCall');
    const activeSocket = socketRef.current;
    if (activeSocket) {
      activeSocket.emit('call_end', { consultationId, type: callType });
    }

    detachCallSocketListeners();
    joinConfirmedRef.current = false;
    if (relayFallbackTimeoutRef.current) {
      clearTimeout(relayFallbackTimeoutRef.current);
      relayFallbackTimeoutRef.current = null;
    }
    if (joinFallbackTimeoutRef.current) {
      clearTimeout(joinFallbackTimeoutRef.current);
      joinFallbackTimeoutRef.current = null;
    }
    if (callReadyIntervalRef.current) {
      clearInterval(callReadyIntervalRef.current);
      callReadyIntervalRef.current = null;
    }
    cleanupPeerConnection();
    cleanupMedia();
    setCallState('waiting');

    if (navigateToPayment) {
      router.replace(`/(tabs)/consultar/pago-consulta?id=${consultationId}`);
    } else {
      router.back();
    }
  };

  const activatePaymentLock = () => {
    if (currentUserRoleRef.current !== 'USER') {
      return;
    }

    setPaymentLocked(true);
    if (paymentAlertShownRef.current) {
      return;
    }

    paymentAlertShownRef.current = true;
    Alert.alert(
      'Pago requerido',
      'Ya pasaron 2 minutos de la consulta. Debes pagar para continuar la llamada.',
      [
        {
          text: 'No pagar y finalizar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.finishConsultation(consultationId, false, { reason: 'USER_DECLINED_PAYMENT' });
            } catch (error) {
              console.warn('No se pudo finalizar por no pago:', error?.message || error);
            } finally {
              leaveCall(false);
            }
          },
        },
        {
          text: 'Ir a pagar',
          onPress: () => leaveCall(true),
        },
      ]
    );
  };

  const schedulePaymentCheck = (data, role = currentUserRoleRef.current) => {
    if (paymentTimerRef.current) {
      clearTimeout(paymentTimerRef.current);
      paymentTimerRef.current = null;
    }

    if (requiresPaymentNow(data, role)) {
      activatePaymentLock();
      return;
    }

    if (!data || role !== 'USER' || hasApprovedPayment(data) || data.status !== 'IN_PROGRESS' || !data.startDate) {
      paymentAlertShownRef.current = false;
      setPaymentLocked(false);
      return;
    }

    const elapsedMs = Date.now() - new Date(data.startDate).getTime();
    const remainingMs = Math.max(2 * 60 * 1000 - elapsedMs, 0);

    paymentTimerRef.current = setTimeout(() => {
      activatePaymentLock();
    }, remainingMs);
  };

  const loadConsultationState = async (showError = false) => {
    try {
      const data = await api.getConsultation(consultationId);
      schedulePaymentCheck(data);
      return data;
    } catch (error) {
      if (showError) {
        Alert.alert('Error', error.message || 'No se pudo cargar la consulta');
      }
      return null;
    }
  };

  const getLocalStream = async () => {
    if (localStreamRef.current) {
      return localStreamRef.current;
    }

    if (!mediaDevices) {
      throw new Error('react-native-webrtc no está disponible');
    }

    const constraints = {
      audio: true,
      video: callType === 'VIDEO'
        ? {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          }
        : false,
    };

    const stream = await mediaDevices.getUserMedia(constraints);
    logCall('INFO', 'Local stream acquired', {
      audioTracks: stream.getAudioTracks()?.length || 0,
      videoTracks: stream.getVideoTracks()?.length || 0,
      callType,
    });

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length > 0) {
      audioTracks[0].enabled = !isMuted;
    }

    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length > 0) {
      videoTracks[0].enabled = isVideoEnabled;
    }

    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  };

  const flushPendingIceCandidates = async () => {
    if (!pcRef.current || !pcRef.current.remoteDescription) {
      return;
    }

    while (pendingIceCandidatesRef.current.length > 0) {
      const candidate = pendingIceCandidatesRef.current.shift();
      await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

  const ensurePeerConnection = async (useRelayOnly = false) => {
    if (pcRef.current) {
      logCall('DEBUG', 'Reusing existing PeerConnection', {
        connectionState: pcRef.current.connectionState,
        iceState: pcRef.current.iceConnectionState,
      });
      return pcRef.current;
    }

    const peerConnection = new RTCPeerConnection(useRelayOnly ? relayOnlyIceConfig : defaultIceConfig);
    logCall('INFO', 'PeerConnection created', { useRelayOnly });
    const stream = await getLocalStream();
    const remoteMediaStream = MediaStream ? new MediaStream() : null;

    if (remoteMediaStream) {
      remoteMediaStreamRef.current = remoteMediaStream;
      remoteStreamRef.current = remoteMediaStream;
      setRemoteStream(remoteMediaStream);
    }

    if (typeof peerConnection.addStream === 'function') {
      peerConnection.addStream(stream);
      logCall('DEBUG', 'Local stream added via addStream()', {
        audioTracks: stream.getAudioTracks()?.length || 0,
        videoTracks: stream.getVideoTracks()?.length || 0,
      });
    } else {
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });
      logCall('DEBUG', 'Local tracks added via addTrack()', {
        audioTracks: stream.getAudioTracks()?.length || 0,
        videoTracks: stream.getVideoTracks()?.length || 0,
      });
    }

    peerConnection.ontrack = (event) => {
      logCall('INFO', 'ontrack received', { streams: event.streams?.length || 0 });
      if (event.streams?.[0]) {
        remoteStreamRef.current = event.streams[0];
        setRemoteStream(event.streams[0]);
        setCallState('connected');
        return;
      }

      if (event.track && remoteMediaStreamRef.current) {
        remoteMediaStreamRef.current.addTrack(event.track);
        remoteStreamRef.current = remoteMediaStreamRef.current;
        setRemoteStream(remoteMediaStreamRef.current);
        setCallState('connected');
      }
    };

    peerConnection.onaddstream = (event) => {
      logCall('INFO', 'onaddstream received');
      if (event.stream) {
        remoteStreamRef.current = event.stream;
        setRemoteStream(event.stream);
        setCallState('connected');
      }
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        logCall('DEBUG', 'Sending ICE candidate');
        socketRef.current.emit('webrtc_ice_candidate', {
          consultationId,
          candidate: serializeIceCandidate(event.candidate),
        });
      }
    };

    peerConnection.onconnectionstatechange = () => {
      const { connectionState } = peerConnection;
      console.log('Estado WebRTC:', connectionState);
      logCall('INFO', 'Peer connection state changed', connectionState);

      if (connectionState === 'connected') {
        setCallState('connected');
        if (callReadyIntervalRef.current) {
          clearInterval(callReadyIntervalRef.current);
          callReadyIntervalRef.current = null;
        }
      }

      if (connectionState === 'failed' || connectionState === 'disconnected') {
        setCallState('reconnecting');
      }

      if (connectionState === 'closed') {
        setCallState('waiting');
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE state:', peerConnection.iceConnectionState);
      logCall('INFO', 'ICE state changed', peerConnection.iceConnectionState);

      if (
        peerConnection.iceConnectionState === 'connected' ||
        peerConnection.iceConnectionState === 'completed'
      ) {
        setCallState('connected');
        if (callReadyIntervalRef.current) {
          clearInterval(callReadyIntervalRef.current);
          callReadyIntervalRef.current = null;
        }
      }
    };

    pcRef.current = peerConnection;
    return peerConnection;
  };

  const startOfferIfReady = async (useRelayOnly = false) => {
    if (offerStartedRef.current || paymentLockedRef.current) {
      return;
    }

    offerStartedRef.current = true;

    try {
      const pc = await ensurePeerConnection(useRelayOnly);

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'VIDEO',
      });

      await pc.setLocalDescription(offer);

      socketRef.current?.emit('webrtc_offer', {
        consultationId,
        offer: serializeSessionDescription(offer),
      });

      logCall('INFO', 'webrtc_offer_sent', {
        from: currentUserIdRef.current,
        isInitiator,
        offerStarted: offerStartedRef.current,
        pcState: pcRef.current?.connectionState,
      });
      logCall('INFO', 'Offer sent correctamente');
      setCallState('calling');
    } catch (error) {
      offerStartedRef.current = false;
      logCall('ERROR', 'Error creando offer', error);
    }
  };

  const startCallReadyHeartbeat = (activeSocket) => {
    if (callReadyIntervalRef.current) {
      clearInterval(callReadyIntervalRef.current);
    }

    callReadyIntervalRef.current = setInterval(() => {
      if (
        !mountedRef.current ||
        paymentLockedRef.current ||
        pcRef.current?.connectionState === 'connected'
      ) {
        return;
      }

      if (!joinConfirmedRef.current) {
        logCall('DEBUG', 'Heartbeat re-join consultation');
        activeSocket.emit('join_consultation', { consultationId });
      }
      logCall('DEBUG', 'Heartbeat call_ready emit');
      activeSocket.emit('call_ready', { consultationId });
    }, 2000);
  };

  const handleOffer = async (offer) => {
    logCall('INFO', 'Received WebRTC offer');
    const peerConnection = await ensurePeerConnection();
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    await flushPendingIceCandidates();

    const answer = await peerConnection.createAnswer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: callType === 'VIDEO',
    });
    await peerConnection.setLocalDescription(answer);
    logCall('INFO', 'Sending WebRTC answer');

    socketRef.current?.emit('webrtc_answer', {
      consultationId,
      answer: serializeSessionDescription(answer),
    });
    setCallState('connecting');
  };

  const handleAnswer = async (answer) => {
    if (!pcRef.current) {
      return;
    }

    logCall('INFO', 'Received WebRTC answer');
    await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    await flushPendingIceCandidates();
  };

  const handleRemoteIceCandidate = async (candidate) => {
    if (!RTCIceCandidate) {
      return;
    }

    if (!pcRef.current || !pcRef.current.remoteDescription) {
      pendingIceCandidatesRef.current.push(candidate);
      return;
    }

    logCall('DEBUG', 'Received remote ICE candidate');
    await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
  };

  const setupSocketListeners = (activeSocket) => {
    const onCallReady = async (data) => {
      if (data?.consultationId !== consultationId) {
        return;
      }

      logCall('INFO', 'call_ready received', data);
      if (!isInitiator) {
        setCallState('connecting');
      }
    };

    const onWebRtcOffer = async (data) => {
      if (data?.consultationId !== consultationId || paymentLockedRef.current) {
        return;
      }

      try {
        await handleOffer(data.offer);
      } catch (error) {
        console.error('Error procesando oferta WebRTC', error);
        logCall('ERROR', 'Error processing WebRTC offer', error?.message || error);
      }
    };

    const onWebRtcAnswer = async (data) => {
      if (data?.consultationId !== consultationId || paymentLockedRef.current) {
        return;
      }

      try {
        await handleAnswer(data.answer);
      } catch (error) {
        console.error('Error procesando respuesta WebRTC', error);
        logCall('ERROR', 'Error processing WebRTC answer', error?.message || error);
      }
    };

    const onIceCandidate = async (data) => {
      if (data?.consultationId !== consultationId || paymentLockedRef.current) {
        return;
      }

      try {
        await handleRemoteIceCandidate(data.candidate);
      } catch (error) {
        console.error('Error agregando ICE candidate', error);
        logCall('ERROR', 'Error adding ICE candidate', error?.message || error);
      }
    };

    const onRequestOffer = async (data) => {
      if (data?.consultationId !== consultationId || paymentLockedRef.current) {
        return;
      }

      if (!isInitiator) {
        logCall('INFO', 'request_offer recibido pero no soy initiator → ignorando');
        return;
      }

      logCall('INFO', 'request_offer recibido → creando offer');
      try {
        await startOfferIfReady(false);
      } catch (error) {
        logCall('ERROR', 'Error en request_offer', error);
      }
    };

    const onPaymentRequired = (data) => {
      if (data?.consultationId === consultationId) {
        activatePaymentLock();
      }
    };

    const onCallEnd = (data) => {
      if (data?.consultationId !== consultationId) {
        return;
      }

      logCall('INFO', 'call_end received', data);
      joinConfirmedRef.current = false;
      if (relayFallbackTimeoutRef.current) {
        clearTimeout(relayFallbackTimeoutRef.current);
        relayFallbackTimeoutRef.current = null;
      }
      if (joinFallbackTimeoutRef.current) {
        clearTimeout(joinFallbackTimeoutRef.current);
        joinFallbackTimeoutRef.current = null;
      }
      if (callReadyIntervalRef.current) {
        clearInterval(callReadyIntervalRef.current);
        callReadyIntervalRef.current = null;
      }
      detachCallSocketListeners();
      cleanupPeerConnection();
      cleanupMedia();
      setCallState('waiting');
      router.back();
    };

    activeSocket.on('call_ready', onCallReady);
    activeSocket.on('webrtc_offer', onWebRtcOffer);
    activeSocket.on('webrtc_answer', onWebRtcAnswer);
    activeSocket.on('webrtc_ice_candidate', onIceCandidate);
    activeSocket.on('request_offer', onRequestOffer);
    activeSocket.on('payment_required', onPaymentRequired);
    activeSocket.on('call_end', onCallEnd);

    return () => {
      activeSocket.off('call_ready', onCallReady);
      activeSocket.off('webrtc_offer', onWebRtcOffer);
      activeSocket.off('webrtc_answer', onWebRtcAnswer);
      activeSocket.off('webrtc_ice_candidate', onIceCandidate);
      activeSocket.off('request_offer', onRequestOffer);
      activeSocket.off('payment_required', onPaymentRequired);
      activeSocket.off('call_end', onCallEnd);
    };
  };

  const scheduleRelayFallback = () => {
    relayFallbackTimeoutRef.current = setTimeout(async () => {
      if (!mountedRef.current || paymentLockedRef.current) return;
      const state = pcRef.current?.connectionState || pcRef.current?.iceConnectionState;
      if (state === 'connected' || state === 'completed') return;

      if (isInitiator && !offerStartedRef.current) {
        logCall('WARN', 'Fallback: forcing offer creation');
        try {
          await startOfferIfReady(true); // usar TURN relay
        } catch (e) {
          console.warn('Fallback TURN offer failed:', e?.message || e);
          logCall('ERROR', 'Fallback TURN offer failed', e?.message || e);
        }
      }
    }, 12000);
  };

  useEffect(() => {
    mountedRef.current = true;

    const initializeCall = async () => {
      try {
        await clearCallLog();
        logCall('INFO', 'VideoCallScreen initialized', {
          consultationId,
          callType,
          isInitiator,
        });
        if (!RTCPeerConnection) {
          Alert.alert(
            'WebRTC no disponible',
            'Esta función requiere el APK nativo con react-native-webrtc instalado.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
          return;
        }

        const token = await AsyncStorage.getItem('token');
        if (!token) {
          throw new Error('No se encontro la sesion activa para iniciar la llamada');
        }

        const activeSocket = await connectSocket(token);
        logCall('INFO', 'Socket connected', { socketId: activeSocket?.id });
        socketRef.current = activeSocket;
        const [profile, consultation] = await Promise.all([
          api.getProfile(),
          api.getConsultation(consultationId),
        ]);

        currentUserIdRef.current = profile?.id || null;
        currentUserRoleRef.current = profile?.role || null;
        schedulePaymentCheck(consultation, profile?.role || null);

        if (requiresPaymentNow(consultation, profile?.role || null)) {
          setLoading(false);
          return;
        }

        socketListenersCleanupRef.current = setupSocketListeners(activeSocket);
        startCallReadyHeartbeat(activeSocket);
        setCallState(isInitiator ? 'calling' : 'waiting');

        activeSocket.emit('join_consultation', { consultationId }, async (response) => {
          logCall('INFO', 'join_consultation callback', response || {});
          if (response?.error) {
            Alert.alert('Error', response.error);
            router.back();
            return;
          }

          joinConfirmedRef.current = true;
          await ensureMediaPermissions();
          await getLocalStream();
          logCall('INFO', 'Emitting initial call_ready');
          activeSocket.emit('call_ready', { consultationId });
          // Programar fallback a TURN si no conecta rápido
          scheduleRelayFallback();
        });

        // Fallback defensivo: si el callback no llega, no quedarse en "Preparando llamada..."
        joinFallbackTimeoutRef.current = setTimeout(async () => {
          if (!mountedRef.current || paymentLockedRef.current || joinConfirmedRef.current) {
            return;
          }

          try {
            await ensureMediaPermissions();
            await getLocalStream();
            logCall('WARN', 'Fallback join/call_ready triggered');
            activeSocket.emit('join_consultation', { consultationId });
            activeSocket.emit('call_ready', { consultationId });
          if (isInitiator && !offerStartedRef.current) {
              logCall('WARN', 'Fallback inicial: intentando crear offer');
              await startOfferIfReady(false);
            }
            scheduleRelayFallback();
          } catch (error) {
            console.warn('Fallback join/call_ready fallo:', error?.message || error);
            logCall('ERROR', 'Fallback join/call_ready failed', error?.message || error);
          }
        }, 3000);
      } catch (error) {
        console.error('Error inicializando videollamada:', error);
        logCall('ERROR', 'initializeCall failed', error?.message || error);
        flushLogsToApi('initializeError');
        Alert.alert('Error', error.message || 'No se pudo inicializar la llamada');
        router.back();
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    initializeCall();

    const pollId = setInterval(async () => {
      const data = await loadConsultationState(false);
      if (data?.payment?.status === 'APPROVED') {
        setPaymentLocked(false);
      }
    }, 15000);

    return () => {
      mountedRef.current = false;
      logCall('INFO', 'VideoCallScreen unmounted');
      flushLogsToApi('unmount');
      joinConfirmedRef.current = false;
      clearInterval(pollId);
      if (paymentTimerRef.current) {
        clearTimeout(paymentTimerRef.current);
      }
      if (callReadyIntervalRef.current) {
        clearInterval(callReadyIntervalRef.current);
        callReadyIntervalRef.current = null;
      }
      if (relayFallbackTimeoutRef.current) {
        clearTimeout(relayFallbackTimeoutRef.current);
        relayFallbackTimeoutRef.current = null;
      }
      if (joinFallbackTimeoutRef.current) {
        clearTimeout(joinFallbackTimeoutRef.current);
        joinFallbackTimeoutRef.current = null;
      }
      detachCallSocketListeners();
      socketRef.current = null;
      cleanupPeerConnection();
      cleanupMedia();
    };
  }, []);

  useEffect(() => {
    paymentLockedRef.current = paymentLocked;
  }, [paymentLocked]);

  useEffect(() => {
    if (callState !== 'connected') {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
      if (callState === 'waiting' || callState === 'calling' || callState === 'connecting') {
        setCallDurationSeconds(0);
      }
      return undefined;
    }

    if (!durationTimerRef.current) {
      durationTimerRef.current = setInterval(() => {
        setCallDurationSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    };
  }, [callState]);

  useEffect(() => {
    if (!InCallManager) {
      return undefined;
    }

    const enableSpeaker = callType === 'VIDEO';
    try {
      InCallManager.start({ media: callType === 'VIDEO' ? 'video' : 'audio' });
      InCallManager.setSpeakerphoneOn(enableSpeaker);
      InCallManager.setForceSpeakerphoneOn(enableSpeaker);
      setSpeakerEnabled(enableSpeaker);
    } catch (error) {
      logCall('WARN', 'InCallManager speaker setup failed', error?.message || error);
    }

    return () => {
      try {
        InCallManager.setForceSpeakerphoneOn(null);
        InCallManager.stop();
      } catch (error) {
        // no-op
      }
    };
  }, [callType]);

  const toggleSpeaker = () => {
    const next = !speakerEnabled;
    setSpeakerEnabled(next);
    if (!InCallManager) {
      return;
    }
    try {
      InCallManager.setSpeakerphoneOn(next);
      InCallManager.setForceSpeakerphoneOn(next);
    } catch (error) {
      logCall('WARN', 'Toggle speaker failed', error?.message || error);
    }
  };

  const flipCamera = () => {
    if (callType !== 'VIDEO') {
      return;
    }

    const videoTrack = localStreamRef.current?.getVideoTracks?.()?.[0];
    if (!videoTrack || typeof videoTrack._switchCamera !== 'function') {
      logCall('WARN', 'Camera flip not supported on this device/runtime');
      return;
    }

    try {
      videoTrack._switchCamera();
      setIsFrontCamera((prev) => !prev);
    } catch (error) {
      logCall('ERROR', 'Error flipping camera', error?.message || error);
    }
  };

  const toggleMute = () => {
    const nextValue = !isMuted;
    setIsMuted(nextValue);

    const audioTrack = localStreamRef.current?.getAudioTracks()?.[0];
    if (audioTrack) {
      audioTrack.enabled = !nextValue;
    }
  };

  const toggleVideo = () => {
    if (callType !== 'VIDEO') {
      return;
    }

    const nextValue = !isVideoEnabled;
    setIsVideoEnabled(nextValue);

    const videoTrack = localStreamRef.current?.getVideoTracks()?.[0];
    if (videoTrack) {
      videoTrack.enabled = nextValue;
    }
  };

  const endCall = () => {
    leaveCall(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.remoteVideoContainer} pointerEvents="none">
          {remoteStream && RTCView ? (
            <RTCView
              streamURL={remoteStream.toURL()}
              style={styles.remoteVideo}
              objectFit="cover"
              mirror={false}
            />
          ) : (
            <View style={styles.videoPlaceholder}>
              <Ionicons
                name={callType === 'VIDEO' ? 'videocam' : 'call'}
                size={64}
                color={COLORS.textSecondary}
              />
              <Text style={styles.placeholderText}>
                {callState === 'connected' ? 'Esperando video...' : 'Esperando a la otra persona'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.headerOverlay}>
          <Text style={styles.contactName}>{contactName}</Text>
          <Text style={styles.callDuration}>{formatDuration(callDurationSeconds)}</Text>
        </View>

        {(isMuted || paymentLocked) && (
          <View style={styles.statusBubble}>
            <Text style={styles.statusBubbleText}>
              {paymentLocked ? 'Debes pagar para continuar' : 'El microfono esta silenciado'}
            </Text>
          </View>
        )}

        {callType === 'VIDEO' && localStream && RTCView && (
          <View style={styles.localVideoContainer}>
            <RTCView
              streamURL={localStream.toURL()}
              style={styles.localVideo}
              objectFit="cover"
              mirror={isFrontCamera}
            />
          </View>
        )}

        <View style={styles.controlsWrap}>
          <View style={styles.controls}>
            <TouchableOpacity style={styles.controlButton} disabled={paymentLocked}>
              <Ionicons name="ellipsis-horizontal" size={24} color="#111" />
            </TouchableOpacity>

            {callType === 'VIDEO' && (
              <TouchableOpacity
                style={styles.controlButton}
                onPress={toggleVideo}
                disabled={paymentLocked}
              >
                <Ionicons name={isVideoEnabled ? 'videocam' : 'videocam-off'} size={24} color="#111" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.controlButton}
              onPress={toggleSpeaker}
              disabled={paymentLocked}
            >
              <Ionicons name={speakerEnabled ? 'volume-high' : 'volume-mute'} size={24} color="#111" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={toggleMute}
              disabled={paymentLocked}
            >
              <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={24} color="#111" />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.controlButton, styles.endCallButton]} onPress={endCall}>
              <Ionicons name="call" size={24} color={COLORS.textWhite} />
            </TouchableOpacity>
          </View>
        </View>

        {callType === 'VIDEO' && (
          <TouchableOpacity style={styles.flipButton} onPress={flipCamera} disabled={paymentLocked}>
            <Ionicons
              name={isFrontCamera ? 'camera-reverse' : 'camera-reverse-outline'}
              size={22}
              color={COLORS.textWhite}
            />
          </TouchableOpacity>
        )}

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.textWhite} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 8,
  },
  remoteVideoContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  localVideoContainer: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    width: 110,
    height: 165,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
    elevation: 6,
    ...SHADOWS.lg,
  },
  localVideo: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  headerOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 5,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 16,
    paddingVertical: 10,
  },
  contactName: {
    ...TYPOGRAPHY.body,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textWhite,
  },
  callDuration: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
    color: '#EDEDED',
  },
  statusBubble: {
    position: 'absolute',
    top: 92,
    alignSelf: 'center',
    backgroundColor: 'rgba(48,48,48,0.85)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    zIndex: 6,
  },
  statusBubbleText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textWhite,
  },
  controlsWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 22,
    zIndex: 7,
    alignItems: 'center',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 36,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  endCallButton: {
    backgroundColor: COLORS.accentRed,
  },
  flipButton: {
    position: 'absolute',
    right: 16,
    bottom: 276,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 7,
  },
});

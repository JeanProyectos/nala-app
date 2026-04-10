# Configuración de Videollamadas y Llamadas de Voz

## Estado Actual

✅ **Lo que ya funciona:**
- Conexión WebSocket para chat de texto
- Tipos de consulta: CHAT, VOICE, VIDEO (definidos en backend)
- Interfaz de usuario para seleccionar tipo de consulta

❌ **Lo que falta para videollamadas/llamadas reales:**

## 1. Librerías Necesarias en el Frontend

### Instalar WebRTC para React Native:

```bash
cd "C:\Proyectos Jean Git\nala-app"
npm install react-native-webrtc
npm install @react-native-community/cameraroll  # Opcional, para permisos
```

**Nota:** `react-native-webrtc` requiere configuración nativa adicional.

### Alternativa más simple (recomendada para Expo):
Usar un servicio de terceros como:
- **Twilio Video** (más fácil de integrar)
- **Agora.io** (buena opción para React Native)
- **Daily.co** (solución completa)

## 2. Backend - Servidor de Señalización WebRTC

El backend actual solo tiene chat de texto. Para videollamadas necesitas:

### Opción A: Servidor de Señalización WebRTC
- Extender el `chat.gateway.ts` para manejar señales WebRTC
- Eventos necesarios:
  - `offer` - Oferta WebRTC
  - `answer` - Respuesta WebRTC
  - `ice-candidate` - Candidatos ICE
  - `call-request` - Solicitud de llamada
  - `call-accept` - Aceptar llamada
  - `call-reject` - Rechazar llamada
  - `call-end` - Terminar llamada

### Opción B: Servicio de Terceros (Recomendado)
- **Twilio**: Servidor de señales incluido
- **Agora.io**: Servidor de señales incluido
- **Daily.co**: Servidor de señales incluido

## 3. Servidores STUN/TURN

Para conexiones WebRTC necesitas servidores STUN/TURN:

### STUN (gratis):
- Google STUN: `stun:stun.l.google.com:19302`
- Puedes usar servidores públicos gratuitos

### TURN (requiere servidor propio o servicio):
- **Opción 1**: Servicio gratuito (limitado)
  - Twilio STUN/TURN (gratis con límites)
  - Metered.ca (gratis con límites)
  
- **Opción 2**: Servidor propio
  - Coturn (open source)
  - Configurar en servidor propio

## 4. Permisos Necesarios

### En `app.json` o `app.config.js`:
```json
{
  "expo": {
    "plugins": [
      [
        "expo-av",
        {
          "microphonePermission": "Permitir acceso al micrófono para llamadas",
          "cameraPermission": "Permitir acceso a la cámara para videollamadas"
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "Necesitamos acceso a la cámara para videollamadas",
        "NSMicrophoneUsageDescription": "Necesitamos acceso al micrófono para llamadas"
      }
    },
    "android": {
      "permissions": [
        "CAMERA",
        "RECORD_AUDIO",
        "MODIFY_AUDIO_SETTINGS"
      ]
    }
  }
}
```

## 5. Implementación Mínima Recomendada

### Usando Twilio Video (Más fácil):

1. **Instalar:**
```bash
npm install twilio-video
```

2. **Configurar en backend:**
- Crear cuenta en Twilio
- Obtener API Key y Secret
- Crear endpoint para generar tokens de acceso

3. **Implementar en frontend:**
- Componente de videollamada usando Twilio Video SDK
- Manejar conexión, desconexión, mutear, etc.

### Usando Agora.io (Buena opción):

1. **Instalar:**
```bash
npm install react-native-agora
```

2. **Configurar:**
- Crear cuenta en Agora.io
- Obtener App ID
- Implementar componente de videollamada

## 6. Pasos para Implementar (Twilio Video - Ejemplo)

### Backend:
1. Instalar: `npm install twilio`
2. Crear servicio para generar tokens
3. Endpoint: `POST /consultations/:id/video-token`

### Frontend:
1. Instalar: `npm install twilio-video`
2. Crear componente `VideoCallScreen.js`
3. Conectar con token del backend
4. Manejar eventos de llamada

## 7. Pruebas Locales

Para pruebas locales necesitas:
- ✅ Backend corriendo
- ✅ WebSocket funcionando
- ✅ Servidor STUN/TURN (o servicio)
- ✅ Permisos de cámara/micrófono
- ✅ Dos dispositivos o emuladores para probar

## Recomendación

**Para desarrollo rápido:** Usa **Twilio Video** o **Agora.io**
- Servidores incluidos
- Documentación completa
- Planes gratuitos para desarrollo
- Fácil integración con React Native

**Para producción propia:** Implementa WebRTC nativo
- Más control
- Sin costos de servicio
- Requiere más configuración

## Siguiente Paso

¿Quieres que implemente la solución con Twilio Video o prefieres otra opción?

# Instalación y Configuración de Videollamadas

## ✅ Lo que ya está implementado:

1. **Backend:**
   - ✅ Eventos WebRTC agregados al `chat.gateway.ts`:
     - `webrtc_offer` - Oferta WebRTC
     - `webrtc_answer` - Respuesta WebRTC
     - `webrtc_ice_candidate` - Candidatos ICE
     - `call_request` - Solicitud de llamada
     - `call_accept` - Aceptar llamada
     - `call_reject` - Rechazar llamada
     - `call_end` - Terminar llamada

2. **Frontend:**
   - ✅ Componente `VideoCallScreen.js` creado
   - ✅ Ruta `/consultar/video-call` configurada
   - ✅ Botones de llamada en el chat
   - ✅ Socket mejorado con mejor manejo de errores

## ⚠️ Lo que falta para que funcione completamente:

### 1. Instalar react-native-webrtc

**IMPORTANTE:** `react-native-webrtc` requiere configuración nativa y NO funciona directamente con Expo Go. Necesitas:

**Opción A: Usar EAS Build (Recomendado)**
```bash
npm install react-native-webrtc
npx expo install expo-dev-client
npx expo prebuild
```

**Opción B: Usar un servicio de terceros (Más fácil)**
- **Daily.co** (recomendado para Expo)
- **Twilio Video**
- **Agora.io**

### 2. Actualizar VideoCallScreen.js

El componente actual tiene código de ejemplo. Necesitas reemplazar las partes comentadas con la implementación real de WebRTC.

### 3. Permisos en app.json

Agregar permisos de cámara y micrófono:

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

## 🚀 Implementación Rápida con Daily.co (Recomendado)

### 1. Instalar Daily.co:
```bash
npm install @daily-co/react-native-daily-js
```

### 2. Crear cuenta en Daily.co (gratis para desarrollo)

### 3. Backend: Crear endpoint para generar tokens Daily
```typescript
// En consultations.controller.ts
@Post(':id/daily-token')
async getDailyToken(@Param('id') id: number, @Request() req) {
  // Generar token de Daily.co para la consulta
  // Retornar token y room name
}
```

### 4. Actualizar VideoCallScreen para usar Daily.co

## 📝 Notas Importantes:

1. **WebRTC nativo** requiere build nativo (no funciona en Expo Go)
2. **Servicios de terceros** (Daily.co, Twilio) funcionan mejor con Expo
3. **STUN/TURN servers** están configurados con servidores públicos de Google
4. Para producción, necesitas tu propio servidor TURN

## 🔧 Próximos Pasos:

1. Decidir: ¿WebRTC nativo o servicio de terceros?
2. Si servicio: ¿Daily.co, Twilio o Agora?
3. Implementar la solución elegida
4. Probar con dos dispositivos

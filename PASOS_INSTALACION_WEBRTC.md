# Pasos para Instalar react-native-webrtc

## ⚠️ IMPORTANTE

`react-native-webrtc` **NO funciona con Expo Go**. Necesitas hacer un build nativo.

## Paso 1: Instalar Dependencias

```bash
cd "C:\Proyectos Jean Git\nala-app"
npm install
```

Esto instalará:
- `react-native-webrtc`
- `expo-dev-client`
- `expo-av`

## Paso 2: Prebuild (Generar código nativo)

```bash
npx expo prebuild
```

Esto generará las carpetas `android/` y `ios/` con el código nativo necesario.

## Paso 3: Build para Desarrollo

### Android:
```bash
npx expo run:android
```

### iOS (solo en Mac):
```bash
npx expo run:ios
```

## Paso 4: Usar Expo Dev Client

Después del build, en lugar de usar Expo Go, usa la app que se generó con `expo-dev-client`.

```bash
npx expo start --dev-client
```

## Alternativa: EAS Build (Recomendado para producción)

Si prefieres no hacer builds locales:

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --profile development --platform android
# o
eas build --profile development --platform ios
```

## Verificación

1. La app debería compilar sin errores
2. Al abrir una videollamada, deberías ver:
   - Permisos de cámara/micrófono
   - Video local funcionando
   - Conexión WebRTC establecida

## Troubleshooting

### Error: "react-native-webrtc module not found"
- Ejecuta `npx expo prebuild` de nuevo
- Limpia y reconstruye: `cd android && ./gradlew clean` (Android)

### Error: "Permission denied"
- Verifica que los permisos estén en `app.json`
- En Android, verifica `AndroidManifest.xml`
- En iOS, verifica `Info.plist`

### Error: "WebRTC not available"
- Asegúrate de estar usando `expo-dev-client`, no Expo Go
- Verifica que `react-native-webrtc` esté instalado correctamente

## Notas

- **No uses Expo Go** - WebRTC requiere código nativo
- **Primera vez**: El build puede tardar 10-15 minutos
- **Builds subsecuentes**: Son más rápidos (solo cambios)

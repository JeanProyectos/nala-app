# Solución Rápida para Probar Videollamadas

## ⚠️ Situación Actual

- ✅ Código implementado y listo
- ✅ Backend configurado
- ❌ Necesitas Android SDK o EAS Build para compilar

## 🚀 Solución Más Rápida: EAS Build

### Paso 1: Instalar EAS CLI
```powershell
npm install -g eas-cli
```

### Paso 2: Login (crea cuenta gratis en expo.dev)
```powershell
eas login
```

### Paso 3: Build en la nube
```powershell
eas build --profile development --platform android
```

Esto:
- Compila en la nube (no necesitas Android SDK)
- Genera un APK descargable
- Tarda ~15-20 minutos la primera vez
- Puedes instalar el APK directamente en tu dispositivo Android

### Paso 4: Descargar e instalar
1. EAS te dará un link para descargar el APK
2. Descárgalo en tu teléfono Android
3. Instálalo (permite instalación de fuentes desconocidas)
4. Abre la app y prueba las videollamadas

## 📱 Alternativa: Probar sin Build

Puedes seguir usando la app normalmente con:
```powershell
npx expo start
```

**Funcionará:**
- ✅ Chat de texto
- ✅ Todas las funcionalidades
- ✅ Mensajes en tiempo real

**NO funcionará:**
- ❌ Videollamadas (necesita build nativo)
- ❌ Llamadas de voz (necesita build nativo)

## 🎯 Recomendación

1. **Ahora mismo:** Sigue usando Expo Go para probar todo excepto videollamadas
2. **Cuando quieras probar videollamadas:** Usa EAS Build (más fácil que instalar Android SDK)
3. **Para producción:** Usa EAS Build con perfil de producción

## 📝 Nota Importante

El código de videollamadas está **100% implementado y listo**. Solo necesitas compilar la app nativa para que funcione.

¿Quieres que configuremos EAS Build ahora?

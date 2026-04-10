# Configuración de Android SDK para Videollamadas

## Problema Actual

No tienes Android SDK configurado. Tienes dos opciones:

## Opción 1: Configurar Android SDK Localmente (Más complejo)

### Paso 1: Instalar Android Studio
1. Descarga Android Studio: https://developer.android.com/studio
2. Instálalo con todas las opciones por defecto
3. Abre Android Studio y ve a: **Tools > SDK Manager**
4. Instala:
   - Android SDK Platform 33 o superior
   - Android SDK Build-Tools
   - Android Emulator

### Paso 2: Configurar Variables de Entorno

**En PowerShell (temporal para esta sesión):**
```powershell
$env:ANDROID_HOME = "C:\Users\TuUsuario\AppData\Local\Android\Sdk"
$env:PATH += ";$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\tools"
```

**Permanente (en Variables de Entorno de Windows):**
1. Busca "Variables de entorno" en Windows
2. Agrega nueva variable de sistema:
   - Nombre: `ANDROID_HOME`
   - Valor: `C:\Users\TuUsuario\AppData\Local\Android\Sdk`
3. Edita `PATH` y agrega:
   - `%ANDROID_HOME%\platform-tools`
   - `%ANDROID_HOME%\tools`

### Paso 3: Verificar Instalación
```powershell
adb version
```

### Paso 4: Build
```powershell
npx expo run:android
```

## Opción 2: Usar EAS Build (Más fácil - Recomendado)

EAS Build compila en la nube, no necesitas Android SDK local.

### Paso 1: Instalar EAS CLI
```powershell
npm install -g eas-cli
```

### Paso 2: Login
```powershell
eas login
```

### Paso 3: Configurar
```powershell
eas build:configure
```

### Paso 4: Build en la nube
```powershell
# Build de desarrollo
eas build --profile development --platform android

# O build de producción
eas build --profile production --platform android
```

Esto generará un APK que puedes descargar e instalar.

## Opción 3: Probar sin Build (Solo para desarrollo)

Puedes probar la app con Expo Go para todo excepto videollamadas:

```powershell
npx expo start
```

**Nota:** Las videollamadas NO funcionarán en Expo Go, pero todo lo demás sí.

## Recomendación

Para desarrollo rápido: **Usa EAS Build** (Opción 2)
- No necesitas instalar Android SDK
- Compila en la nube
- Más fácil de configurar
- Puedes descargar el APK directamente

¿Quieres que configuremos EAS Build?

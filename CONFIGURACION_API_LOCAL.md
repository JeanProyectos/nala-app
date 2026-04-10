# 🔧 Configuración API Local vs Producción

## 📍 Estado Actual

**Actualmente apunta a**: `https://nala-api.patasypelos.xyz` (PRODUCCIÓN)

## 🔄 Cómo Cambiar a Local

### Opción 1: Cambiar en `app.json` (Recomendado para desarrollo)

Edita `app.json` línea 63:

```json
"extra": {
  "router": {},
  "eas": {
    "projectId": "7ad61771-8843-4944-8dfa-33624e575ffc"
  },
  "apiUrl": "http://192.168.20.53:3000"  // ← Cambiar aquí para local
}
```

**Para volver a producción**:
```json
"apiUrl": "https://nala-api.patasypelos.xyz"
```

### Opción 2: Usar Variable de Entorno (Más flexible)

Puedes crear un archivo `.env` en `nala-app`:

```bash
# .env.local
API_URL=http://192.168.20.53:3000

# .env.production
API_URL=https://nala-api.patasypelos.xyz
```

Y modificar `services/api.js` para leerlo (requiere `expo-constants` o `react-native-dotenv`).

---

## 📋 Configuraciones por Escenario

### Desarrollo Local (Tu PC)
```json
"apiUrl": "http://192.168.20.53:3000"
```
- ✅ Backend corriendo en tu PC (`nala-api`)
- ✅ App en dispositivo físico o emulador
- ✅ Misma red WiFi

### Emulador Android (Misma PC)
```json
"apiUrl": "http://10.0.2.2:3000"
```
- ✅ Backend corriendo en tu PC
- ✅ App en emulador Android
- ✅ `10.0.2.2` es la IP especial del emulador

### Producción (Cloudflare Tunnel)
```json
"apiUrl": "https://nala-api.patasypelos.xyz"
```
- ✅ Backend corriendo en tu PC
- ✅ Cloudflare Tunnel activo
- ✅ App en cualquier dispositivo

---

## 🎯 Recomendación

**Para desarrollo local ahora mismo**:

1. Cambia `app.json` línea 63:
   ```json
   "apiUrl": "http://192.168.20.53:3000"
   ```

2. Reinicia Expo:
   ```bash
   # Detener Expo (Ctrl+C)
   # Volver a iniciar
   npx expo start
   ```

3. Verifica que funciona:
   - Abre la app
   - Intenta hacer login
   - Verifica logs en backend

**Para producción**:
- Cambia de vuelta a `"https://nala-api.patasypelos.xyz"`
- O mejor aún, crea un script que cambie automáticamente

---

## 🔍 Cómo Verificar Qué URL Está Usando

En `services/api.js` línea 9:
```javascript
const API_URL = Constants.expoConfig?.extra?.apiUrl || "http://192.168.20.53:3000";
```

Esto lee de `app.json > extra > apiUrl`.

Puedes agregar un log temporal para verificar:
```javascript
console.log('🔗 API URL:', API_URL);
```

---

## ⚠️ Importante

- **Socket.IO también usa esta URL**: El código que actualizamos en `services/socket.js` lee de `app.json` también
- **Si cambias `apiUrl`**: Tanto REST como WebSockets usarán la nueva URL
- **Reinicia Expo**: Después de cambiar `app.json`, reinicia Expo para que tome los cambios

---

**Última actualización**: 2026-03-02

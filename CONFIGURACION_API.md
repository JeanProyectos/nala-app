# 🔧 Configuración de la API

## ⚠️ IMPORTANTE: Configurar la IP de la API

Para que la app móvil se comunique con el backend, necesitas configurar tu IP local en el archivo `services/api.js`.

### Pasos:

1. **Obtener tu IP local:**
   - En Windows: Abre PowerShell y ejecuta:
     ```powershell
     ipconfig
     ```
   - Busca "IPv4 Address" (ejemplo: `192.168.1.8`)

2. **Actualizar el archivo `services/api.js`:**
   - Abre `C:\nala\services\api.js`
   - En la línea 4, cambia:
     ```javascript
     const API_URL = "http://192.168.1.8:3000";
     ```
   - Reemplaza `192.168.1.8` con tu IP local

3. **Asegúrate de que:**
   - El backend esté corriendo en `http://localhost:3000`
   - Tu celular y computadora estén en la misma red WiFi
   - El firewall de Windows permita conexiones en el puerto 3000

### Ejemplo:

Si tu IP es `192.168.1.100`, el archivo debería verse así:

```javascript
const API_URL = "http://192.168.1.100:3000";
```

## 🚀 Iniciar el Backend

1. Abre una terminal en `C:\nala-api`
2. Ejecuta:
   ```bash
   npm run start:dev
   ```
3. Deberías ver: `🚀 API NALA corriendo en http://localhost:3000`

## 📱 Probar la App

1. Inicia la app Expo:
   ```bash
   cd C:\nala
   npx expo start -c
   ```

2. Escanea el QR code con Expo Go

3. La app debería mostrar la pantalla de Login

4. Crea una cuenta o inicia sesión

5. ¡Listo! Ya puedes usar la app conectada al backend

## 🔍 Verificar la Conexión

Si hay problemas de conexión:

1. Verifica que el backend esté corriendo
2. Verifica que la IP en `services/api.js` sea correcta
3. Verifica que ambos dispositivos estén en la misma red WiFi
4. Prueba acceder a `http://TU_IP:3000` desde el navegador del celular


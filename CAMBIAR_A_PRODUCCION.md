# 🔄 Cambiar a Producción para Build APK

## ⚠️ IMPORTANTE

**Para desarrollo local**: `app.json` apunta a `http://192.168.20.53:3000` ✅

**Para generar APK de producción**: Debes cambiar a `https://nala-api.patasypelos.xyz`

---

## 📝 Pasos para Generar APK

### 1. Cambiar `app.json` línea 63:

```json
"apiUrl": "https://nala-api.patasypelos.xyz"
```

### 2. Generar APK:

```bash
cd nala-app
npx eas build --profile production --platform android --non-interactive
```

### 3. Después del build, volver a local:

```json
"apiUrl": "http://192.168.20.53:3000"
```

---

## 🎯 Resumen

| Escenario | URL en `app.json` |
|-----------|-------------------|
| **Desarrollo local** | `http://192.168.20.53:3000` |
| **Build APK** | `https://nala-api.patasypelos.xyz` |

---

**Nota**: Considera crear un script que haga este cambio automáticamente antes del build.

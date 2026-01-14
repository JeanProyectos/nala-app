# NALA - Aplicación de Cuidado de Mascotas

Aplicación React Native con Expo para el cuidado de mascotas.

## Características

- **Chat**: Interfaz de chat simple con mensajes locales
- **Mascota**: Formulario para guardar información de la mascota
- **Perfil**: Configuración del perfil del dueño

## Tecnologías

- React Native
- Expo
- Expo Router (Tabs)
- JavaScript

## Instalación

1. Instala las dependencias:
```bash
npm install
```

2. Inicia el servidor de desarrollo:
```bash
npm start
```

3. Escanea el código QR con la app Expo Go en tu dispositivo móvil, o presiona:
   - `a` para Android
   - `i` para iOS
   - `w` para web

## Estructura del Proyecto

```
nala/
├── app/
│   ├── _layout.js    # Configuración de tabs
│   ├── index.js      # Pantalla Chat
│   ├── mascota.js    # Pantalla Mascota
│   └── perfil.js     # Pantalla Perfil
├── package.json
├── app.json
└── babel.config.js
```

## Notas

- Esta es una versión frontend-only sin backend
- Todos los datos se guardan en estado local
- Preparado para conectar con API en C# / ASP.NET en el futuro

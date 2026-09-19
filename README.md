# Vigilance

Aplicación móvil de vigilancia construida completamente con Expo y React Native.

## Funcionalidad implementada

- Lectura en vivo del acelerómetro y tres niveles de sensibilidad.
- Cuenta regresiva de 5 segundos antes de armar la vigilancia.
- Detección real de movimiento con filtro para evitar disparos aislados.
- Reproducción continua de `Alarm Sound Effect.mp3` y vibración al detectar movimiento.
- Autenticación biométrica real para detener la vigilancia y la alarma.
- Desactivación exclusivamente mediante huella o biometría fuerte del dispositivo, sin PIN de respaldo.
- Servicio nativo Android en primer plano: continúa midiendo con la pantalla bloqueada.
- Temas claro, oscuro y automático, e historial real de alarmas en Cloud Firestore.

## Requisitos

- Node.js compatible con Expo SDK 57.
- JDK 17 o 21 para compilaciones Android locales.
- Android Studio y Android SDK, o un dispositivo Android con depuración USB.
- Xcode en macOS para ejecutar la versión iOS.

## Instalar y ejecutar

```bash
npm install
npm start
```

Expo Go sirve para comprobar la interfaz, el acelerómetro, el audio, la vibración y la biometría mientras la aplicación permanece abierta. Para probar la vigilancia con pantalla bloqueada en Android se necesita la development build que incluye el módulo local:

```bash
npm run android
```

Conecta un dispositivo Android físico, acepta el permiso de notificaciones y activa Vigilance. Después de la cuenta regresiva, bloquea la pantalla y mueve el teléfono; el servicio debe activar el audio y la vibración. Abre la aplicación y autentícate para detenerlos.

## Firebase e historial

Cada movimiento que activa la alarma crea un documento en la colección `alarmas` de Cloud Firestore. Cada documento contiene únicamente los campos `fecha` y `hora`. El historial observa esa colección en tiempo real. Los eventos locales antiguos de demostración se eliminan al iniciar esta versión; preferencias como tema y sensibilidad continúan en AsyncStorage.

El servicio Android nativo vive en `modules/vigilance-sensor`. Las carpetas `/android` y `/ios` de la raíz se generan mediante Expo y no se versionan, pero el módulo local sí debe permanecer en Git.

import * as LocalAuthentication from 'expo-local-authentication';

export class AuthenticationService {
  async authenticateBiometric() {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      return {
        ok: false,
        method: 'biometric',
        message: 'Este dispositivo no tiene biometría disponible.'
      };
    }

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) {
      return {
        ok: false,
        method: 'biometric',
        message: 'No hay una huella o rostro configurado en el dispositivo.'
      };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Desactivar modo vigilancia',
      promptDescription: 'Confirma tu identidad para detener la protección.',
      cancelLabel: 'Cancelar',
      fallbackLabel: '',
      disableDeviceFallback: true,
      biometricsSecurityLevel: 'strong'
    });

    return {
      ok: result.success,
      method: 'biometric',
      message: result.success ? 'Identidad confirmada.' : 'No se pudo confirmar la identidad.'
    };
  }
}

export class AuthenticationService {
  constructor({ mock = true } = {}) {
    this.mock = mock;
    this.validPin = '1234';
  }

  async authenticateBiometric() {
    await new Promise((resolve) => window.setTimeout(resolve, 650));
    return {
      ok: true,
      method: 'biometric',
      message: this.mock ? 'Biometría mock aprobada.' : 'Biometría aprobada.'
    };
  }

  async authenticatePin(pin) {
    await new Promise((resolve) => window.setTimeout(resolve, 280));
    if (pin === this.validPin) {
      return { ok: true, method: 'pin' };
    }
    return {
      ok: false,
      method: 'pin',
      message: 'PIN incorrecto. Intenta nuevamente.'
    };
  }
}

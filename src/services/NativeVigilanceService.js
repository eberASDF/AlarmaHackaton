import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import VigilanceSensorModule from '../../modules/vigilance-sensor/src/VigilanceSensorModule';
import { ALARM_AUDIO } from '../assets.js';

let cachedAudioUri = null;

export const NativeVigilanceService = {
  isAvailable() {
    if (Platform.OS !== 'android' || !VigilanceSensorModule) return false;
    try {
      return VigilanceSensorModule.isAvailable();
    } catch {
      return false;
    }
  },

  async start({ graceMs, threshold }) {
    if (!this.isAvailable()) {
      throw new Error('El servicio Android nativo no está incluido en esta compilación.');
    }
    const audioUri = await resolveAlarmAudioUri();
    return VigilanceSensorModule.startMonitoring(graceMs, threshold, audioUri);
  },

  async stop() {
    if (!this.isAvailable()) return null;
    return VigilanceSensorModule.stopMonitoring();
  },

  async getStatus() {
    if (!this.isAvailable()) return null;
    return VigilanceSensorModule.getStatus();
  }
};

async function resolveAlarmAudioUri() {
  if (cachedAudioUri) return cachedAudioUri;
  const asset = Asset.fromModule(ALARM_AUDIO);
  await asset.downloadAsync();
  cachedAudioUri = asset.localUri ?? asset.uri;
  if (!cachedAudioUri) throw new Error('No fue posible preparar el archivo de alarma.');
  return cachedAudioUri;
}

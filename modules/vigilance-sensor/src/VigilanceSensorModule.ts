import { NativeModule, requireOptionalNativeModule } from 'expo';

export type NativeVigilanceStatus = {
  state: 'stopped' | 'arming' | 'armed' | 'alarming' | 'error';
  x: number;
  y: number;
  z: number;
  motion: number;
  threshold: number;
  armedAt: number;
  triggeredAt: number;
  error: string;
};

declare class VigilanceSensorModule extends NativeModule {
  isAvailable(): boolean;
  startMonitoring(
    graceMs: number,
    threshold: number,
    audioUri: string
  ): Promise<NativeVigilanceStatus>;
  stopMonitoring(): Promise<NativeVigilanceStatus>;
  getStatus(): Promise<NativeVigilanceStatus>;
}

export default requireOptionalNativeModule<VigilanceSensorModule>('VigilanceSensor');

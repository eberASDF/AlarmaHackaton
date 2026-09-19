import { Accelerometer } from 'expo-sensors';

const UPDATE_INTERVAL_MS = 100;
const REQUIRED_HITS = 2;

export class MotionDetectionService {
  constructor() {
    this.subscription = null;
    this.threshold = 0.32;
    this.armed = false;
    this.lastReading = null;
    this.smoothedMotion = 0;
    this.consecutiveHits = 0;
    this.onReading = null;
    this.onTrigger = null;
  }

  async isAvailable() {
    return Accelerometer.isAvailableAsync();
  }

  async start({ threshold, onReading, onTrigger }) {
    await this.stop();
    const available = await this.isAvailable();
    if (!available) throw new Error('Este dispositivo no tiene un acelerómetro disponible.');

    this.threshold = threshold;
    this.onReading = onReading;
    this.onTrigger = onTrigger;
    this.armed = false;
    this.resetMotionWindow();
    Accelerometer.setUpdateInterval(UPDATE_INTERVAL_MS);
    this.subscription = Accelerometer.addListener((reading) => this.handleReading(reading));
  }

  arm() {
    this.resetMotionWindow();
    this.armed = true;
  }

  disarm() {
    this.armed = false;
    this.consecutiveHits = 0;
  }

  setThreshold(threshold) {
    this.threshold = threshold;
  }

  async stop() {
    this.disarm();
    this.subscription?.remove();
    this.subscription = null;
    this.lastReading = null;
    this.onReading = null;
    this.onTrigger = null;
  }

  resetMotionWindow() {
    this.lastReading = null;
    this.smoothedMotion = 0;
    this.consecutiveHits = 0;
  }

  handleReading({ x, y, z, timestamp }) {
    let delta = 0;
    if (this.lastReading) {
      const dx = x - this.lastReading.x;
      const dy = y - this.lastReading.y;
      const dz = z - this.lastReading.z;
      delta = Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    this.lastReading = { x, y, z };
    this.smoothedMotion =
      this.smoothedMotion === 0 ? delta : this.smoothedMotion * 0.65 + delta * 0.35;

    const snapshot = {
      x,
      y,
      z,
      motion: this.smoothedMotion,
      threshold: this.threshold,
      timestamp: timestamp ?? Date.now()
    };
    this.onReading?.(snapshot);

    if (!this.armed) return;
    this.consecutiveHits =
      this.smoothedMotion >= this.threshold
        ? this.consecutiveHits + 1
        : Math.max(0, this.consecutiveHits - 1);

    if (this.consecutiveHits >= REQUIRED_HITS) {
      this.disarm();
      this.onTrigger?.(snapshot);
    }
  }
}

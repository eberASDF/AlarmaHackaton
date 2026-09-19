import { AlarmRepository } from './AlarmRepository.js';
import { StorageService } from './StorageService.js';

const LEGACY_STORAGE_KEY = 'vigilance-history-events';

export class HistoryService {
  constructor() {
    this.listeners = new Set();
    this.errorListeners = new Set();
    this.events = [];
    this.initialized = false;
    this.initializing = null;
    this.unsubscribeRemote = null;
  }

  async initialize() {
    if (this.initialized) return this.getEvents();
    if (this.initializing) return this.initializing;

    this.initializing = Promise.all([
      StorageService.remove(LEGACY_STORAGE_KEY),
      AlarmRepository.getAll()
    ]).then(([, alarms]) => {
      this.replaceAlarms(alarms);
      this.unsubscribeRemote = AlarmRepository.subscribe(
        (remoteAlarms) => this.replaceAlarms(remoteAlarms),
        (error) => this.notifyError(error)
      );
      this.initialized = true;
      return this.getEvents();
    }).catch((error) => {
      this.initializing = null;
      this.notifyError(error);
      throw error;
    });

    return this.initializing;
  }

  getEvents() {
    return [...this.events].sort((a, b) => b.timestamp - a.timestamp);
  }

  async addAlarm({ triggeredAt }) {
    if (!this.initialized) this.initialize().catch(() => {});
    const alarm = await AlarmRepository.create({ triggeredAt });
    const event = toHistoryEvent(alarm);
    this.events = [event, ...this.events.filter((item) => item.id !== event.id)].slice(0, 80);
    this.notify();
    return alarm;
  }

  async refresh() {
    const alarms = await AlarmRepository.getAll();
    this.replaceAlarms(alarms);
    return this.getEvents();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeErrors(listener) {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  notify() {
    const events = this.getEvents();
    this.listeners.forEach((listener) => listener(events));
  }

  notifyError(error) {
    this.errorListeners.forEach((listener) => listener(error));
  }

  replaceAlarms(alarms) {
    this.events = alarms.map(toHistoryEvent).sort((a, b) => b.timestamp - a.timestamp).slice(0, 80);
    this.notify();
  }
}

function toHistoryEvent(alarm) {
  const timestamp = parseLocalDateTime(alarm.fecha, alarm.hora);
  return {
    id: alarm.id,
    type: 'alarm',
    title: 'Movimiento detectado',
    description: `Alarma activada el ${alarm.fecha ?? 'día desconocido'} a las ${alarm.hora ?? '--:--:--'}.`,
    detail: {},
    timestamp: Number.isFinite(timestamp) && timestamp > 0 ? timestamp : Date.now()
  };
}

function parseLocalDateTime(dateValue, timeValue) {
  const [year, month, day] = String(dateValue ?? '').split('-').map(Number);
  const [hours, minutes, seconds] = String(timeValue ?? '').split(':').map(Number);
  if (![year, month, day, hours, minutes, seconds].every(Number.isFinite)) return Number.NaN;
  return new Date(year, month - 1, day, hours, minutes, seconds).getTime();
}

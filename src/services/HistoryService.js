import { StorageService } from './StorageService.js';

const STORAGE_KEY = 'vigilance-history-events';

export class HistoryService {
  constructor() {
    this.listeners = new Set();
    this.events = StorageService.get(STORAGE_KEY, []).map((event) => ({
      ...event,
      type: 'event'
    }));
    StorageService.set(STORAGE_KEY, this.events);
  }

  getEvents() {
    return [...this.events].sort((a, b) => b.timestamp - a.timestamp);
  }

  addEvent({ type, title, description, detail = {} }) {
    const event = {
      id: crypto.randomUUID(),
      type,
      title,
      description,
      detail,
      timestamp: Date.now()
    };

    this.events = [event, ...this.events].slice(0, 80);
    StorageService.set(STORAGE_KEY, this.events);
    this.notify();
    return event;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    const events = this.getEvents();
    this.listeners.forEach((listener) => listener(events));
  }
}

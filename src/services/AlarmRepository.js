import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc
} from 'firebase/firestore';
import { firebaseFirestore } from '../firebase.js';

const ALARMS_PATH = 'alarmas';
const alarmsCollection = collection(firebaseFirestore, ALARMS_PATH);

export const AlarmRepository = {
  async getAll() {
    const snapshot = await getDocs(alarmsCollection);
    return snapshot.docs.map(toAlarm);
  },

  subscribe(onAlarms, onError) {
    return onSnapshot(
      alarmsCollection,
      (snapshot) => onAlarms(snapshot.docs.map(toAlarm)),
      onError
    );
  },

  async create({ triggeredAt = Date.now() }) {
    const date = new Date(triggeredAt);
    const id = `${String(triggeredAt).padStart(13, '0')}-${Math.random().toString(36).slice(2, 8)}`;
    const alarmRef = doc(firebaseFirestore, ALARMS_PATH, id);
    const alarm = {
      fecha: formatLocalDate(date),
      hora: formatLocalTime(date)
    };

    await setDoc(alarmRef, alarm);
    return {
      ...alarm,
      id,
      timestamp: triggeredAt
    };
  }
};

function formatLocalDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatLocalTime(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function toAlarm(document) {
  return {
    id: document.id,
    ...document.data()
  };
}

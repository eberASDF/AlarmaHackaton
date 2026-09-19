import AsyncStorage from '@react-native-async-storage/async-storage';

export const StorageService = {
  async get(key, fallback) {
    try {
      const value = await AsyncStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  },

  async set(key, value) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch {
      // The app remains usable if local persistence is temporarily unavailable.
    }
  },

  async remove(key) {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // Legacy local data is non-critical and can be retried on the next launch.
    }
  }
};

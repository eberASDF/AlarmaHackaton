import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  PermissionsAndroid,
  Platform,
  Text,
  useColorScheme,
  Vibration,
  View
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import {
  AuthenticationModal,
  BottomNavigation,
  HistoryScreen,
  HomeScreen,
  ThemeSelector
} from './components/index.jsx';
import { ALARM_AUDIO } from './assets.js';
import { AuthenticationService } from './services/AuthenticationService.js';
import { HistoryService } from './services/HistoryService.js';
import { MotionDetectionService } from './services/MotionDetectionService.js';
import { NativeVigilanceService } from './services/NativeVigilanceService.js';
import { StorageService } from './services/StorageService.js';
import { VIGILANCE_STATES, isArmedState } from './state/vigilanceStates.js';
import { createPalette } from './theme.js';

const ARMING_SECONDS = 5;
const NATIVE_STATUS_INTERVAL_MS = 250;
const SENSITIVITY_LEVELS = {
  high: { label: 'Alta', threshold: 0.2 },
  medium: { label: 'Media', threshold: 0.32 },
  low: { label: 'Baja', threshold: 0.5 }
};

const authenticationService = new AuthenticationService();
const historyService = new HistoryService();
const motionService = new MotionDetectionService();

const initialSensorReading = {
  x: 0,
  y: 0,
  z: 0,
  motion: 0,
  threshold: SENSITIVITY_LEVELS.medium.threshold,
  timestamp: null
};

const initialAppState = {
  vigilanceState: VIGILANCE_STATES.IDLE,
  previousState: VIGILANCE_STATES.IDLE,
  activeSince: null,
  alarmTriggeredAt: null,
  events: []
};

function reducer(state, action) {
  switch (action.type) {
    case 'ARMING':
      return {
        ...state,
        vigilanceState: VIGILANCE_STATES.ARMING,
        activeSince: null,
        alarmTriggeredAt: null
      };
    case 'ARMED':
      return {
        ...state,
        vigilanceState: VIGILANCE_STATES.ARMED,
        activeSince: action.activeSince,
        alarmTriggeredAt: null
      };
    case 'ALARM_TRIGGERED':
      return {
        ...state,
        vigilanceState: VIGILANCE_STATES.ALARMING,
        alarmTriggeredAt: action.triggeredAt
      };
    case 'AUTH_REQUIRED':
      return {
        ...state,
        previousState: state.vigilanceState,
        vigilanceState: VIGILANCE_STATES.AUTH_REQUIRED
      };
    case 'AUTH_CANCELLED':
      return { ...state, vigilanceState: state.previousState };
    case 'DISARMED':
      return {
        ...state,
        vigilanceState: VIGILANCE_STATES.DISARMED,
        activeSince: null,
        alarmTriggeredAt: null
      };
    case 'RESET_IDLE':
      return { ...state, vigilanceState: VIGILANCE_STATES.IDLE };
    case 'EVENTS_CHANGED':
      return { ...state, events: action.events };
    default:
      return state;
  }
}

function VigilanceApp() {
  const systemTheme = useColorScheme() ?? 'light';
  const alarmPlayer = useAudioPlayer(ALARM_AUDIO, { downloadFirst: true, updateInterval: 1000 });
  const [state, dispatch] = useReducer(reducer, initialAppState);
  const [currentTab, setCurrentTab] = useState('home');
  const [themeMode, setThemeMode] = useState('auto');
  const [themeReady, setThemeReady] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [armingSeconds, setArmingSeconds] = useState(ARMING_SECONDS);
  const [sensitivity, setSensitivity] = useState('medium');
  const [sensorReading, setSensorReading] = useState(initialSensorReading);
  const [sensorError, setSensorError] = useState('');
  const [monitorMode, setMonitorMode] = useState('none');

  const stateRef = useRef(state.vigilanceState);
  const monitorModeRef = useRef('none');
  const alarmHandledRef = useRef(false);
  const activationTokenRef = useRef(0);

  const isArmedVisual = isArmedState(state.vigilanceState);
  const resolvedTheme = themeMode === 'auto' ? systemTheme : themeMode;
  const palette = createPalette(resolvedTheme, isArmedVisual);
  const activeMs = state.activeSince ? now - state.activeSince : 0;
  const threshold = SENSITIVITY_LEVELS[sensitivity].threshold;

  useEffect(() => {
    stateRef.current = state.vigilanceState;
  }, [state.vigilanceState]);

  useEffect(() => {
    monitorModeRef.current = monitorMode;
  }, [monitorMode]);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix'
    }).catch(() => {
      setSensorError('No fue posible preparar el modo de audio de alarma.');
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      StorageService.get('vigilance-theme', 'auto'),
      StorageService.get('vigilance-sensitivity', 'medium')
    ]).then(([savedTheme, savedSensitivity]) => {
      if (!mounted) return;
      setThemeMode(savedTheme);
      if (SENSITIVITY_LEVELS[savedSensitivity]) setSensitivity(savedSensitivity);
      setThemeReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!themeReady) return;
    StorageService.set('vigilance-theme', themeMode);
    StorageService.set('vigilance-sensitivity', sensitivity);
  }, [themeMode, sensitivity, themeReady]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = historyService.subscribe((events) => {
      dispatch({ type: 'EVENTS_CHANGED', events });
    });
    const unsubscribeErrors = historyService.subscribeErrors(() => {
      setSensorError('No fue posible leer el historial de alarmas desde Firebase.');
    });
    historyService.initialize().catch(() => {
      setSensorError('No fue posible conectar el historial con Firebase.');
    });
    return () => {
      unsubscribe();
      unsubscribeErrors();
    };
  }, []);

  useEffect(() => {
    if (currentTab !== 'history') return;
    historyService.refresh().catch(() => {
      setSensorError('No fue posible actualizar el historial desde Firestore.');
    });
  }, [currentTab]);

  const startLocalAlarm = useCallback(async () => {
    try {
      alarmPlayer.loop = true;
      alarmPlayer.volume = 1;
      await alarmPlayer.seekTo(0);
      alarmPlayer.play();
      Vibration.vibrate([0, 650, 250, 650, 400], true);
    } catch {
      setSensorError('Se detectó movimiento, pero no fue posible reproducir el audio.');
    }
  }, [alarmPlayer]);

  const stopLocalAlarm = useCallback(async () => {
    Vibration.cancel();
    try {
      alarmPlayer.pause();
      await alarmPlayer.seekTo(0);
    } catch {
      // The native player may already have been released by the operating system.
    }
  }, [alarmPlayer]);

  const handleAlarmTriggered = useCallback(
    async (reading, source) => {
      if (alarmHandledRef.current) return;
      alarmHandledRef.current = true;
      motionService.disarm();
      const triggeredAt = Date.now();
      setSensorReading((current) => ({ ...current, ...reading }));
      dispatch({ type: 'ALARM_TRIGGERED', triggeredAt });

      if (source !== 'native') await startLocalAlarm();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      try {
        await historyService.addAlarm({
          triggeredAt
        });
      } catch {
        setSensorError('La alarma se activó, pero no pudo guardarse en Firebase.');
      }
    },
    [startLocalAlarm]
  );

  useEffect(() => {
    if (!NativeVigilanceService.isAvailable()) return undefined;
    let cancelled = false;

    async function synchronizeNativeStatus() {
      try {
        const status = await NativeVigilanceService.getStatus();
        if (cancelled || !status) return;
        setSensorReading({
          x: Number(status.x ?? 0),
          y: Number(status.y ?? 0),
          z: Number(status.z ?? 0),
          motion: Number(status.motion ?? 0),
          threshold: Number(status.threshold ?? threshold),
          timestamp: Date.now()
        });
        if (status.error) setSensorError(status.error);

        if (['arming', 'armed', 'alarming'].includes(status.state)) {
          if (monitorModeRef.current !== 'native') {
            monitorModeRef.current = 'native';
            setMonitorMode('native');
          }
        }

        if (status.state === 'arming') {
          const remaining = Math.max(0, Math.ceil((Number(status.armedAt) - Date.now()) / 1000));
          setArmingSeconds(remaining);
          if (stateRef.current === VIGILANCE_STATES.IDLE) {
            dispatch({ type: 'ARMING' });
          }
        } else if (status.state === 'armed') {
          setArmingSeconds(0);
          if (
            stateRef.current === VIGILANCE_STATES.IDLE ||
            stateRef.current === VIGILANCE_STATES.ARMING
          ) {
            dispatch({ type: 'ARMED', activeSince: Number(status.armedAt) || Date.now() });
          }
        } else if (status.state === 'alarming') {
          await handleAlarmTriggered(status, 'native');
        }
      } catch {
        // Expo Go does not contain the local Android module; foreground fallback stays active.
      }
    }

    synchronizeNativeStatus();
    const timer = setInterval(synchronizeNativeStatus, NATIVE_STATUS_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [handleAlarmTriggered, threshold]);

  useEffect(() => {
    return () => {
      activationTokenRef.current += 1;
      motionService.stop();
      Vibration.cancel();
    };
  }, []);

  async function handleActivate() {
    if (stateRef.current !== VIGILANCE_STATES.IDLE) return;
    const token = ++activationTokenRef.current;
    alarmHandledRef.current = false;
    setSensorError('');
    setArmingSeconds(ARMING_SECONDS);
    dispatch({ type: 'ARMING' });

    try {
      let selectedMode = 'expo';
      if (NativeVigilanceService.isAvailable()) {
        await requestNotificationPermission();
        await NativeVigilanceService.start({
          graceMs: ARMING_SECONDS * 1000,
          threshold
        });
        selectedMode = 'native';
      } else {
        await motionService.start({
          threshold,
          onReading: setSensorReading,
          onTrigger: (reading) => handleAlarmTriggered(reading, 'expo')
        });
      }

      monitorModeRef.current = selectedMode;
      setMonitorMode(selectedMode);
      for (let remaining = ARMING_SECONDS; remaining > 0; remaining -= 1) {
        if (activationTokenRef.current !== token) return;
        setArmingSeconds(remaining);
        await delay(1000);
      }
      if (activationTokenRef.current !== token) return;

      setArmingSeconds(0);
      if (selectedMode === 'expo') motionService.arm();
      dispatch({ type: 'ARMED', activeSince: Date.now() });
    } catch (error) {
      activationTokenRef.current += 1;
      await motionService.stop();
      await NativeVigilanceService.stop().catch(() => null);
      monitorModeRef.current = 'none';
      setMonitorMode('none');
      setSensorError(error.message ?? 'No fue posible iniciar el acelerómetro.');
      dispatch({ type: 'DISARMED' });
      setTimeout(() => dispatch({ type: 'RESET_IDLE' }), 300);
    }
  }

  async function requestDeactivate() {
    dispatch({ type: 'AUTH_REQUIRED' });
  }

  async function handleAuthenticationSuccess(method) {
    activationTokenRef.current += 1;
    await NativeVigilanceService.stop().catch(() => null);
    await motionService.stop();
    await stopLocalAlarm();
    monitorModeRef.current = 'none';
    setMonitorMode('none');
    setArmingSeconds(ARMING_SECONDS);
    alarmHandledRef.current = false;
    dispatch({ type: 'DISARMED' });
    setTimeout(() => dispatch({ type: 'RESET_IDLE' }), 900);
  }

  async function handleAuthenticationCancel() {
    dispatch({ type: 'AUTH_CANCELLED' });
  }

  function handleSensitivityChange(level) {
    if (stateRef.current !== VIGILANCE_STATES.IDLE) return;
    setSensitivity(level);
    setSensorReading((reading) => ({
      ...reading,
      threshold: SENSITIVITY_LEVELS[level].threshold
    }));
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top', 'bottom']}>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
      <View style={{ flex: 1, backgroundColor: palette.background }}>
        <View
          style={{
            paddingHorizontal: 22,
            paddingTop: 10,
            paddingBottom: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <View>
            <Text style={{ color: palette.muted, fontSize: 14, fontWeight: '600' }}>Vigilance</Text>
            <Text style={{ color: palette.text, fontSize: 29, lineHeight: 34, fontWeight: '800' }}>
              Modo Vigilancia
            </Text>
          </View>
          <ThemeSelector value={themeMode} onChange={setThemeMode} palette={palette} />
        </View>

        <View style={{ flex: 1 }}>
          {currentTab === 'home' ? (
            <HomeScreen
              state={state}
              activeMs={activeMs}
              armingSeconds={armingSeconds}
              sensorError={sensorError}
              onActivate={handleActivate}
              onDeactivate={requestDeactivate}
              palette={palette}
            />
          ) : (
            <HistoryScreen
              events={state.events}
              onBack={() => setCurrentTab('home')}
              palette={palette}
            />
          )}
        </View>

        <BottomNavigation
          currentTab={currentTab}
          onChange={setCurrentTab}
          palette={palette}
        />
      </View>

      <AuthenticationModal
        open={state.vigilanceState === VIGILANCE_STATES.AUTH_REQUIRED}
        service={authenticationService}
        onSuccess={handleAuthenticationSuccess}
        onCancel={handleAuthenticationCancel}
        palette={palette}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <VigilanceApp />
    </SafeAreaProvider>
  );
}

async function requestNotificationPermission() {
  if (Platform.OS !== 'android' || Platform.Version < 33) return true;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS, {
    title: 'Notificación de vigilancia',
    message: 'Vigilance necesita mostrar una notificación mientras protege el dispositivo.',
    buttonPositive: 'Permitir',
    buttonNegative: 'Ahora no'
  });
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

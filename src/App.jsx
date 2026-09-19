import React, { useEffect, useReducer, useState } from 'react';
import {
  AuthenticationModal,
  BottomNavigation,
  HistoryScreen,
  HomeScreen,
  ThemeSelector
} from './components/index.jsx';
import { AuthenticationService } from './services/AuthenticationService.js';
import { HistoryService } from './services/HistoryService.js';
import { StorageService } from './services/StorageService.js';
import { VIGILANCE_STATES, isArmedState } from './state/vigilanceStates.js';

const authenticationService = new AuthenticationService({ mock: true });
const historyService = new HistoryService();

const initialAppState = {
  vigilanceState: VIGILANCE_STATES.IDLE,
  previousState: VIGILANCE_STATES.IDLE,
  activeSince: null,
  events: historyService.getEvents()
};

function reducer(state, action) {
  switch (action.type) {
    case 'ARMING':
      return {
        ...state,
        vigilanceState: VIGILANCE_STATES.ARMING,
        activeSince: null
      };
    case 'ARMED':
      return {
        ...state,
        vigilanceState: VIGILANCE_STATES.ARMED,
        activeSince: action.activeSince
      };
    case 'AUTH_REQUIRED':
      return {
        ...state,
        previousState: state.vigilanceState,
        vigilanceState: VIGILANCE_STATES.AUTH_REQUIRED
      };
    case 'AUTH_CANCELLED':
      return {
        ...state,
        vigilanceState:
          state.previousState === VIGILANCE_STATES.AUTH_REQUIRED
            ? VIGILANCE_STATES.ARMED
            : state.previousState
      };
    case 'DISARMED':
      return {
        ...state,
        vigilanceState: VIGILANCE_STATES.DISARMED,
        activeSince: null
      };
    case 'RESET_IDLE':
      return { ...state, vigilanceState: VIGILANCE_STATES.IDLE };
    case 'EVENTS_CHANGED':
      return { ...state, events: action.events };
    default:
      return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialAppState);
  const [currentTab, setCurrentTab] = useState('home');
  const [themeMode, setThemeMode] = useState(StorageService.get('vigilance-theme', 'auto'));
  const [systemTheme, setSystemTheme] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );
  const [now, setNow] = useState(Date.now());

  const isArmedVisual = isArmedState(state.vigilanceState);
  const resolvedTheme = themeMode === 'auto' ? systemTheme : themeMode;
  const activeMs = state.activeSince ? now - state.activeSince : 0;

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event) => setSystemTheme(event.matches ? 'dark' : 'light');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    StorageService.set('vigilance-theme', themeMode);
  }, [themeMode]);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.dataset.accent = isArmedVisual ? 'armed' : 'normal';
  }, [resolvedTheme, isArmedVisual]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = historyService.subscribe((events) => {
      dispatch({ type: 'EVENTS_CHANGED', events });
    });
    return unsubscribe;
  }, []);

  async function handleActivate() {
    dispatch({ type: 'ARMING' });
    createEvent('Vigilancia activada', 'Preparando el modo vigilancia.');
    await delay(800);

    dispatch({ type: 'ARMED', activeSince: Date.now() });
    createEvent('Modo Vigilancia activo', 'El dispositivo quedó protegido en el prototipo.');
  }

  function requestDeactivate() {
    createEvent('Intento de desactivación', 'Se solicitó autenticación para desactivar vigilancia.');
    dispatch({ type: 'AUTH_REQUIRED' });
  }

  function handleAuthenticationSuccess(method) {
    createEvent('Autenticación confirmada', `Desactivación autorizada con ${method}.`);
    createEvent('Vigilancia desactivada', 'El modo vigilancia fue detenido.');
    dispatch({ type: 'DISARMED' });
    window.setTimeout(() => dispatch({ type: 'RESET_IDLE' }), 900);
  }

  function handleAuthenticationCancel() {
    createEvent('Autenticación cancelada', 'El modo vigilancia continúa activo.');
    dispatch({ type: 'AUTH_CANCELLED' });
  }

  function createEvent(title, description, detail = {}) {
    return historyService.addEvent({ type: 'event', title, description, detail });
  }

  return (
    <div className="app-shell">
      <div className="phone-frame">
        <header className="app-header">
          <div>
            <p className="header-kicker">Vigilance</p>
            <h1>Modo Vigilancia</h1>
          </div>
          <ThemeSelector value={themeMode} onChange={setThemeMode} />
        </header>

        <main className="app-main">
          {currentTab === 'home' ? (
            <HomeScreen
              state={state}
              activeMs={activeMs}
              onActivate={handleActivate}
              onDeactivate={requestDeactivate}
              onOpenHistory={() => setCurrentTab('history')}
            />
          ) : (
            <HistoryScreen
              events={state.events}
              allEvents={state.events}
              onBack={() => setCurrentTab('home')}
            />
          )}
        </main>

        <BottomNavigation currentTab={currentTab} onChange={setCurrentTab} />
      </div>

      <AuthenticationModal
        open={state.vigilanceState === VIGILANCE_STATES.AUTH_REQUIRED}
        service={authenticationService}
        onSuccess={handleAuthenticationSuccess}
        onCancel={handleAuthenticationCancel}
      />
    </div>
  );
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

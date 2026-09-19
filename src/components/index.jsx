import React, { useEffect, useState } from 'react';
import UseAnimations from 'react-useanimations';
import checkmark from 'react-useanimations/lib/checkmark';
import lock from 'react-useanimations/lib/lock';
import {
  ChevronLeft,
  Clock3,
  Fingerprint,
  Gauge,
  History,
  Home,
  KeyRound,
  LockKeyhole,
  Moon,
  Shield,
  ShieldCheck,
  Smartphone,
  Sun,
  Trash2,
  X
} from 'lucide-react';
import { VIGILANCE_STATES, isArmedState } from '../state/vigilanceStates.js';
import { formatDate, formatDuration } from '../utils/formatters.js';

export function HomeScreen({
  state,
  activeMs,
  onActivate,
  onDeactivate,
  onOpenHistory
}) {
  return (
    <section className="home-screen">
      <StatusStage state={state.vigilanceState} activeMs={activeMs} />
      <VigilanceButton state={state.vigilanceState} onActivate={onActivate} onDeactivate={onDeactivate} />
      <button className="history-link" onClick={onOpenHistory}>
        <History size={18} />
        Ver historial
      </button>
    </section>
  );
}

export function StatusStage({ state, activeMs }) {
  const isArming = state === VIGILANCE_STATES.ARMING;
  const isArmed = isArmedState(state);
  const animatedIcon = isArmed ? checkmark : lock;
  const label = isArming ? 'Preparando vigilancia...' : isArmed ? 'ACTIVO' : 'Desactivado';
  const description = isArming
    ? 'Preparando la protección del dispositivo.'
    : isArmed
        ? 'El dispositivo está protegido.'
        : 'Activa la vigilancia para proteger el dispositivo.';

  return (
    <article className={`status-stage ${isArmed ? 'is-armed' : ''}`}>
      <div className="status-orbit" aria-hidden="true">
        <span />
        <span />
      </div>
      <div className="shield-stage">
        <div className="shield-glow" />
        <div className="shield-icon">
          <UseAnimations
            animation={animatedIcon}
            size={82}
            strokeColor="currentColor"
            autoplay
            loop={isArming}
            speed={isArming ? 1.4 : 0.85}
            aria-hidden="true"
          />
        </div>
      </div>
      <div className="status-copy">
        <p>Modo Vigilancia</p>
        <h2>{label}</h2>
        <span>{description}</span>
      </div>
      {isArmed && (
        <div className="quick-facts" aria-label="Resumen de vigilancia">
          <Fact icon={<ShieldCheck size={17} />} label="Vigilancia" value="Activa" />
          <Fact icon={<LockKeyhole size={17} />} label="Desactivación" value="Requiere auth" />
          <Fact icon={<Clock3 size={17} />} label="Tiempo activo" value={formatDuration(activeMs)} />
        </div>
      )}
    </article>
  );
}

function Fact({ icon, label, value }) {
  return (
    <div className="fact">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function VigilanceButton({ state, onActivate, onDeactivate }) {
  const isArming = state === VIGILANCE_STATES.ARMING;
  const isArmed = isArmedState(state);

  return (
    <button
      className={`primary-action ${isArmed ? 'danger' : ''}`}
      onClick={isArmed ? onDeactivate : onActivate}
      disabled={isArming || state === VIGILANCE_STATES.AUTH_REQUIRED}
    >
      {isArming ? <Gauge className="spin" size={20} /> : isArmed ? <LockKeyhole size={20} /> : <Shield size={20} />}
      {isArming ? 'Preparando vigilancia...' : isArmed ? 'Desactivar vigilancia' : 'Activar vigilancia'}
    </button>
  );
}

export function AuthenticationModal({ open, service, onSuccess, onCancel }) {
  const [mode, setMode] = useState('choice');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setMode('choice');
      setPin('');
      setError('');
      setBusy(false);
    }
  }, [open]);

  if (!open) return null;

  async function useBiometrics() {
    setBusy(true);
    setError('');
    const result = await service.authenticateBiometric();
    setBusy(false);
    if (result.ok) onSuccess('Face ID / Touch ID mock');
    else setError(result.message);
  }

  async function submitPin(nextPin = pin) {
    if (nextPin.length < 4) {
      setError('Ingresa entre 4 y 6 dígitos.');
      return;
    }
    setBusy(true);
    const result = await service.authenticatePin(nextPin);
    setBusy(false);
    if (result.ok) onSuccess('PIN');
    else {
      setError(result.message);
      setPin('');
    }
  }

  function addDigit(digit) {
    if (pin.length >= 6 || busy) return;
    const nextPin = `${pin}${digit}`;
    setPin(nextPin);
    setError('');
    if (nextPin.length === 6) submitPin(nextPin);
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <div className="auth-modal">
        <button className="modal-close" aria-label="Cerrar autenticación" onClick={onCancel}>
          <X size={18} />
        </button>
        <div className="auth-icon">{mode === 'pin' ? <KeyRound size={34} /> : <Fingerprint size={38} />}</div>
        <h2 id="auth-title">Autenticación requerida</h2>
        <p>Confirma tu identidad para desactivar el modo vigilancia.</p>

        {mode === 'choice' ? (
          <div className="auth-choices">
            <button onClick={useBiometrics} disabled={busy}>
              <Fingerprint size={20} />
              Usar Face ID / Touch ID
            </button>
            <button onClick={() => setMode('pin')}>
              <KeyRound size={20} />
              Ingresar PIN
            </button>
          </div>
        ) : (
          <PinPad
            pin={pin}
            error={error}
            busy={busy}
            onDigit={addDigit}
            onDelete={() => {
              setError('');
              setPin((value) => value.slice(0, -1));
            }}
            onSubmit={() => submitPin()}
            onBack={() => {
              setMode('choice');
              setPin('');
              setError('');
            }}
          />
        )}
        {mode === 'choice' && error && <p className="error-text">{error}</p>}
      </div>
    </div>
  );
}

export function PinPad({ pin, error, busy, onDigit, onDelete, onSubmit, onBack }) {
  const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0', 'delete'];
  return (
    <div className="pin-entry">
      <div className="pin-dots" aria-label={`${pin.length} dígitos ingresados`}>
        {Array.from({ length: 6 }).map((_, index) => (
          <span key={index} className={index < pin.length ? 'filled' : ''} />
        ))}
      </div>
      {error && <p className="error-text">{error}</p>}
      <div className="pin-grid">
        {numbers.map((item) => {
          if (item === 'back') {
            return (
              <button key={item} className="pin-utility" onClick={onBack}>
                <ChevronLeft size={22} />
              </button>
            );
          }
          if (item === 'delete') {
            return (
              <button key={item} className="pin-utility" onClick={onDelete} disabled={!pin.length || busy}>
                <Trash2 size={20} />
              </button>
            );
          }
          return (
            <button key={item} onClick={() => onDigit(item)} disabled={busy}>
              {item}
            </button>
          );
        })}
      </div>
      <button className="pin-submit" onClick={onSubmit} disabled={pin.length < 4 || busy}>
        Confirmar PIN
      </button>
      <span className="pin-hint">PIN mock: 1234</span>
    </div>
  );
}

export function HistoryScreen({ events, allEvents, onBack }) {
  return (
    <section className="history-screen">
      <div className="screen-title">
        <button onClick={onBack} aria-label="Volver al inicio">
          <ChevronLeft size={22} />
        </button>
        <div>
          <p>Eventos</p>
          <h2>Historial</h2>
        </div>
      </div>

      {events.length ? (
        <div className="history-list">
          {events.map((event) => (
            <HistoryItem event={event} key={event.id} />
          ))}
        </div>
      ) : (
        <EmptyState hasEvents={allEvents.length > 0} />
      )}
    </section>
  );
}

export function HistoryItem({ event }) {
  return (
    <article className="history-item">
      <div className="history-icon"><History size={18} /></div>
      <div>
        <h3>{event.title}</h3>
        <time>{formatDate(event.timestamp)}</time>
        <p>{event.description}</p>
        {event.detail?.intensity && <span>Intensidad: {event.detail.intensity}</span>}
      </div>
    </article>
  );
}

export function EmptyState({ hasEvents }) {
  return (
    <div className="empty-state">
      <History size={34} />
      <h3>Sin eventos</h3>
      <p>{hasEvents ? 'No hay eventos guardados.' : 'Los eventos de vigilancia aparecerán aquí.'}</p>
    </div>
  );
}

export function ThemeSelector({ value, onChange }) {
  const options = [
    ['light', <Sun size={16} />, 'Light'],
    ['dark', <Moon size={16} />, 'Dark'],
    ['auto', <Smartphone size={16} />, 'Auto']
  ];

  return (
    <div className="theme-selector" aria-label="Selector de tema">
      {options.map(([id, icon, label]) => (
        <button
          key={id}
          className={value === id ? 'selected' : ''}
          onClick={() => onChange(id)}
          title={label}
          aria-label={label}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}

export function BottomNavigation({ currentTab, onChange }) {
  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      <button className={currentTab === 'home' ? 'selected' : ''} onClick={() => onChange('home')}>
        <Home size={21} />
        Inicio
      </button>
      <button className={currentTab === 'history' ? 'selected' : ''} onClick={() => onChange('history')}>
        <History size={21} />
        Historial
      </button>
    </nav>
  );
}

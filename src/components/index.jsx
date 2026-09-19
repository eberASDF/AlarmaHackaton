import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import {
  ChevronLeft,
  Clock3,
  Fingerprint,
  Gauge,
  History,
  Home,
  LockKeyhole,
  Moon,
  Shield,
  ShieldCheck,
  Siren,
  Smartphone,
  Sun,
  X
} from 'lucide-react-native';
import { VIGILANCE_STATES, isArmedState } from '../state/vigilanceStates.js';
import { formatDate, formatDuration } from '../utils/formatters.js';

export function HomeScreen({
  state,
  activeMs,
  armingSeconds,
  sensorError,
  onActivate,
  onDeactivate,
  palette
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.homeContent}
      showsVerticalScrollIndicator={false}
      accessibilityLabel="Pantalla principal de vigilancia"
    >
      <StatusStage
        state={state.vigilanceState}
        previousState={state.previousState}
        activeMs={activeMs}
        armingSeconds={armingSeconds}
        palette={palette}
      />
      {Boolean(sensorError) && (
        <Text accessibilityLiveRegion="assertive" style={[styles.sensorError, { color: palette.danger }]}>
          {sensorError}
        </Text>
      )}
      <VigilanceButton
        state={state.vigilanceState}
        onActivate={onActivate}
        onDeactivate={onDeactivate}
        palette={palette}
      />
    </ScrollView>
  );
}

export function StatusStage({ state, previousState, activeMs, armingSeconds, palette }) {
  const isArming = state === VIGILANCE_STATES.ARMING;
  const isArmed = isArmedState(state);
  const isAlarming =
    state === VIGILANCE_STATES.ALARMING ||
    (state === VIGILANCE_STATES.AUTH_REQUIRED && previousState === VIGILANCE_STATES.ALARMING);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isArmed) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return undefined;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: isAlarming ? 420 : 1200,
          useNativeDriver: true
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: isAlarming ? 420 : 1200,
          useNativeDriver: true
        })
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [isArmed, isAlarming, pulse]);

  const label = isAlarming ? '¡ALARMA!' : isArming ? `${armingSeconds}s` : isArmed ? 'ACTIVO' : 'Desactivado';
  const description = isArming
    ? 'Coloca el teléfono y aléjate antes de que termine la cuenta.'
    : isAlarming
      ? 'Se detectó movimiento. Autentícate para detener el sonido.'
    : isArmed
      ? 'Mueve el teléfono para comprobar la alerta.'
      : 'Activa la vigilancia para proteger el dispositivo.';
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.42, 0.08] });

  return (
    <View style={styles.statusStage} accessibilityLiveRegion="polite">
      <View style={styles.shieldStage}>
        <Animated.View
          style={[
            styles.pulseRing,
            {
              backgroundColor: palette.accentQuiet,
              borderColor: palette.accentLine,
              opacity: pulseOpacity,
              transform: [{ scale: pulseScale }]
            }
          ]}
        />
        <View
          style={[
            styles.shieldCircle,
            { backgroundColor: palette.accentQuiet, borderColor: palette.accentLine }
          ]}
        >
          {isArming ? (
            <ActivityIndicator size="large" color={palette.accent} />
          ) : isAlarming ? (
            <Siren size={72} strokeWidth={1.7} color={palette.danger} />
          ) : isArmed ? (
            <ShieldCheck size={72} strokeWidth={1.7} color={palette.accent} />
          ) : (
            <Shield size={72} strokeWidth={1.7} color={palette.accent} />
          )}
        </View>
      </View>

      <View style={styles.statusCopy}>
        <Text style={[styles.kicker, { color: palette.muted }]}>Modo Vigilancia</Text>
        <Text style={[styles.statusTitle, { color: palette.text }]}>{label}</Text>
        <Text style={[styles.statusDescription, { color: palette.muted }]}>{description}</Text>
      </View>

      {isArmed && (
        <View style={[styles.facts, { borderColor: palette.line }]}>
          <Fact
            icon={<ShieldCheck size={18} color={palette.accent} />}
            label="Vigilancia"
            value={isAlarming ? 'Movimiento detectado' : 'Activa'}
            palette={palette}
          />
          <Fact
            icon={<LockKeyhole size={18} color={palette.accent} />}
            label="Desactivación"
            value="Requiere huella"
            palette={palette}
          />
          <Fact
            icon={<Clock3 size={18} color={palette.accent} />}
            label="Tiempo activo"
            value={formatDuration(activeMs)}
            palette={palette}
            last
          />
        </View>
      )}
    </View>
  );
}

function Fact({ icon, label, value, palette, last = false }) {
  return (
    <View style={[styles.fact, !last && { borderBottomColor: palette.line, borderBottomWidth: 1 }]}>
      {icon}
      <View style={styles.factCopy}>
        <Text style={[styles.factLabel, { color: palette.muted }]}>{label}</Text>
        <Text style={[styles.factValue, { color: palette.text }]}>{value}</Text>
      </View>
    </View>
  );
}

export function VigilanceButton({ state, onActivate, onDeactivate, palette }) {
  const isArming = state === VIGILANCE_STATES.ARMING;
  const isArmed = isArmedState(state);
  const isAlarming = state === VIGILANCE_STATES.ALARMING;
  const disabled = isArming || state === VIGILANCE_STATES.AUTH_REQUIRED;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={isArmed ? onDeactivate : onActivate}
      style={({ pressed }) => [
        styles.primaryButton,
        { backgroundColor: isArmed ? palette.danger : palette.accent },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed
      ]}
    >
      {isArming ? (
        <Gauge size={21} color="#FFFFFF" />
      ) : isArmed ? (
        <LockKeyhole size={21} color="#FFFFFF" />
      ) : (
        <Shield size={21} color="#FFFFFF" />
      )}
      <Text style={styles.primaryButtonText}>
        {isArming
          ? 'Preparando vigilancia...'
          : isArmed
            ? isAlarming
              ? 'Detener alarma'
              : 'Desactivar vigilancia'
            : 'Activar vigilancia'}
      </Text>
    </Pressable>
  );
}

export function AuthenticationModal({ open, service, onSuccess, onCancel, palette }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setError('');
      setBusy(false);
    }
  }, [open]);

  async function useBiometrics() {
    setBusy(true);
    setError('');
    try {
      const result = await service.authenticateBiometric();
      if (result.ok) onSuccess('biometría del dispositivo');
      else setError(result.message);
    } catch {
      setError('No fue posible iniciar la autenticación biométrica.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={[styles.modalBackdrop, { backgroundColor: palette.overlay }]}>
        <View
          style={[
            styles.authModal,
            { backgroundColor: palette.elevated, borderColor: palette.line }
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar autenticación"
            onPress={onCancel}
            style={styles.modalClose}
          >
            <X size={20} color={palette.muted} />
          </Pressable>

          <View style={[styles.authIcon, { backgroundColor: palette.accentQuiet }]}>
            <Fingerprint size={38} color={palette.accent} />
          </View>
          <Text style={[styles.modalTitle, { color: palette.text }]}>Huella requerida</Text>
          <Text style={[styles.modalDescription, { color: palette.muted }]}>
            Usa tu huella para desactivar el modo vigilancia.
          </Text>

          <View style={styles.authChoices}>
            <ActionButton
              label={busy ? 'Verificando huella...' : 'Usar huella'}
              icon={busy ? null : <Fingerprint size={20} color="#FFFFFF" />}
              onPress={useBiometrics}
              disabled={busy}
              palette={palette}
            />
          </View>
          {Boolean(error) && (
            <Text accessibilityLiveRegion="assertive" style={[styles.errorText, { color: palette.danger }]}>
              {error}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

function ActionButton({ label, icon, onPress, disabled, palette }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.modalPrimaryButton,
        { backgroundColor: palette.accent },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed
      ]}
    >
      {disabled ? <ActivityIndicator color="#FFFFFF" size="small" /> : icon}
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function HistoryScreen({ events, onBack, palette }) {
  return (
    <ScrollView contentContainerStyle={styles.historyContent} showsVerticalScrollIndicator={false}>
      <View style={styles.screenTitle}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver al inicio"
          onPress={onBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <ChevronLeft size={24} color={palette.accent} />
        </Pressable>
        <View>
          <Text style={[styles.kicker, { color: palette.muted }]}>Alarmas reales</Text>
          <Text style={[styles.screenTitleText, { color: palette.text }]}>Historial</Text>
        </View>
      </View>

      {events.length ? (
        <View style={[styles.historyList, { borderColor: palette.line }]}>
          {events.map((event, index) => (
            <HistoryItem
              event={event}
              key={event.id}
              palette={palette}
              last={index === events.length - 1}
            />
          ))}
        </View>
      ) : (
        <EmptyState palette={palette} />
      )}
    </ScrollView>
  );
}

export function HistoryItem({ event, palette, last }) {
  return (
    <View style={[styles.historyItem, !last && { borderBottomColor: palette.line, borderBottomWidth: 1 }]}>
      <View style={[styles.historyIcon, { backgroundColor: palette.accentQuiet }]}>
        <History size={18} color={palette.accent} />
      </View>
      <View style={styles.historyCopy}>
        <Text style={[styles.historyTitle, { color: palette.text }]}>{event.title}</Text>
        <Text style={[styles.historyTime, { color: palette.faint }]}>{formatDate(event.timestamp)}</Text>
        <Text style={[styles.historyDescription, { color: palette.muted }]}>{event.description}</Text>
        {Boolean(event.detail?.intensity) && (
          <Text style={[styles.historyDetail, { color: palette.accent }]}>
            Intensidad: {event.detail.intensity}
          </Text>
        )}
      </View>
    </View>
  );
}

export function EmptyState({ palette }) {
  return (
    <View style={styles.emptyState}>
      <History size={36} color={palette.accent} />
      <Text style={[styles.emptyTitle, { color: palette.text }]}>Sin eventos</Text>
      <Text style={[styles.emptyDescription, { color: palette.muted }]}>
        Las alarmas activadas por movimiento aparecerán aquí desde Firebase.
      </Text>
    </View>
  );
}

export function ThemeSelector({ value, onChange, palette }) {
  const options = [
    ['light', Sun, 'Tema claro'],
    ['dark', Moon, 'Tema oscuro'],
    ['auto', Smartphone, 'Tema automático']
  ];

  return (
    <View style={styles.themeSelector} accessibilityRole="radiogroup">
      {options.map(([id, Icon, label]) => {
        const selected = value === id;
        return (
          <Pressable
            key={id}
            accessibilityRole="radio"
            accessibilityLabel={label}
            accessibilityState={{ selected }}
            onPress={() => onChange(id)}
            style={[
              styles.themeButton,
              selected && { backgroundColor: palette.accent },
              !selected && { backgroundColor: 'transparent' }
            ]}
          >
            <Icon size={16} color={selected ? '#FFFFFF' : palette.muted} />
          </Pressable>
        );
      })}
    </View>
  );
}

export function BottomNavigation({ currentTab, onChange, palette }) {
  return (
    <View
      style={[
        styles.bottomNav,
        {
          backgroundColor: palette.elevated,
          borderColor: palette.line,
          shadowColor: palette.text
        }
      ]}
      accessibilityRole="tablist"
    >
      <NavButton
        selected={currentTab === 'home'}
        label="Inicio"
        icon={Home}
        onPress={() => onChange('home')}
        palette={palette}
      />
      <NavButton
        selected={currentTab === 'history'}
        label="Historial"
        icon={History}
        onPress={() => onChange('history')}
        palette={palette}
      />
    </View>
  );
}

function NavButton({ selected, label, icon: Icon, onPress, palette }) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.navButton,
        selected && { backgroundColor: palette.accentQuiet }
      ]}
    >
      <Icon size={22} color={selected ? palette.accent : palette.muted} />
      <Text style={[styles.navLabel, { color: selected ? palette.accent : palette.muted }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  homeContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingBottom: 16,
    gap: 14
  },
  statusStage: {
    minHeight: 350,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 20
  },
  shieldStage: {
    width: 170,
    height: 170,
    alignItems: 'center',
    justifyContent: 'center'
  },
  pulseRing: {
    position: 'absolute',
    width: 164,
    height: 164,
    borderRadius: 82,
    borderWidth: 1
  },
  shieldCircle: {
    width: 146,
    height: 146,
    borderRadius: 73,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1
  },
  statusCopy: {
    alignItems: 'center',
    gap: 6
  },
  kicker: {
    fontSize: 14,
    fontWeight: '600'
  },
  statusTitle: {
    fontSize: 42,
    lineHeight: 48,
    fontWeight: '800'
  },
  statusDescription: {
    maxWidth: 310,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center'
  },
  facts: {
    width: '100%',
    borderTopWidth: 1,
    borderBottomWidth: 1
  },
  fact: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
    paddingVertical: 10
  },
  factCopy: {
    flex: 1,
    gap: 2
  },
  factLabel: {
    fontSize: 12
  },
  factValue: {
    fontSize: 14,
    fontWeight: '700'
  },
  sensorPanel: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 22,
    padding: 15,
    gap: 11,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2
  },
  sensorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  sensorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  sensorIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sensorTitle: {
    fontSize: 15,
    fontWeight: '800'
  },
  sensorMode: {
    fontSize: 11,
    marginTop: 2
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5
  },
  axisGrid: {
    flexDirection: 'row',
    gap: 8
  },
  axisValue: {
    flex: 1,
    minHeight: 55,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2
  },
  axisLabel: {
    fontSize: 11,
    fontWeight: '700'
  },
  axisNumber: {
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    fontWeight: '700'
  },
  motionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  motionLabel: {
    fontSize: 12,
    fontWeight: '600'
  },
  motionValue: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    fontWeight: '800'
  },
  motionTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden'
  },
  motionFill: {
    height: '100%',
    borderRadius: 4
  },
  thresholdText: {
    marginTop: -6,
    fontSize: 10,
    textAlign: 'right'
  },
  sensitivityRow: {
    flexDirection: 'row',
    gap: 8
  },
  sensitivityButton: {
    flex: 1,
    minHeight: 38,
    borderWidth: 1,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sensorError: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    textAlign: 'center'
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 18
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800'
  },
  historyLink: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  historyLinkText: {
    fontSize: 15,
    fontWeight: '700'
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.985 }]
  },
  disabled: {
    opacity: 0.5
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16
  },
  authModal: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 13,
    borderWidth: 1,
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 22,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12
  },
  modalClose: {
    position: 'absolute',
    right: 14,
    top: 14,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1
  },
  authIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    textAlign: 'center'
  },
  modalDescription: {
    maxWidth: 300,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center'
  },
  authChoices: {
    width: '100%',
    gap: 8,
    marginTop: 4
  },
  modalPrimaryButton: {
    minHeight: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 18
  },
  secondaryButton: {
    minHeight: 50,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700'
  },
  errorText: {
    minHeight: 20,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'center'
  },
  pinEntry: {
    width: '100%',
    gap: 10
  },
  pinDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 6
  },
  pinDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1
  },
  pinGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 12
  },
  keypadButton: {
    width: '29%',
    aspectRatio: 1.45,
    maxHeight: 62,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center'
  },
  keypadPressed: {
    opacity: 0.68,
    transform: [{ scale: 0.96 }]
  },
  keypadNumber: {
    fontSize: 23,
    fontWeight: '600'
  },
  pinHint: {
    fontSize: 12,
    textAlign: 'center'
  },
  historyContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 24
  },
  screenTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 16
  },
  backButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center'
  },
  screenTitleText: {
    fontSize: 31,
    lineHeight: 36,
    fontWeight: '800'
  },
  historyList: {
    borderTopWidth: 1,
    borderBottomWidth: 1
  },
  historyItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 16
  },
  historyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center'
  },
  historyCopy: {
    flex: 1
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700'
  },
  historyTime: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2
  },
  historyDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 7
  },
  historyDetail: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 7
  },
  emptyState: {
    flex: 1,
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800'
  },
  emptyDescription: {
    maxWidth: 260,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center'
  },
  themeSelector: {
    flexDirection: 'row',
    gap: 3
  },
  themeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center'
  },
  bottomNav: {
    minHeight: 70,
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 6,
    padding: 7,
    borderWidth: 1,
    borderRadius: 27,
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8
  },
  navButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3
  },
  navLabel: {
    fontSize: 12,
    fontWeight: '700'
  }
});

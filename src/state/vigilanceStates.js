export const VIGILANCE_STATES = {
  IDLE: 'idle',
  ARMING: 'arming',
  ARMED: 'armed',
  ALARMING: 'alarming',
  AUTH_REQUIRED: 'authenticationRequired',
  DISARMED: 'disarmed'
};

export function isArmedState(state) {
  return [
    VIGILANCE_STATES.ARMED,
    VIGILANCE_STATES.ALARMING,
    VIGILANCE_STATES.AUTH_REQUIRED
  ].includes(state);
}

export function isAlarmState(state) {
  return state === VIGILANCE_STATES.ALARMING;
}

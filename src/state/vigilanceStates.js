export const VIGILANCE_STATES = {
  IDLE: 'idle',
  ARMING: 'arming',
  ARMED: 'armed',
  AUTH_REQUIRED: 'authenticationRequired',
  DISARMED: 'disarmed'
};

export function isArmedState(state) {
  return [
    VIGILANCE_STATES.ARMED,
    VIGILANCE_STATES.AUTH_REQUIRED
  ].includes(state);
}

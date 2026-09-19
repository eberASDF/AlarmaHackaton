const light = {
  background: '#F5F7FB',
  surface: '#FFFFFF',
  elevated: 'rgba(255,255,255,0.96)',
  text: '#111827',
  muted: '#667085',
  faint: '#98A2B3',
  line: 'rgba(17,24,39,0.09)',
  blue: '#007AFF',
  danger: '#D9343F',
  success: '#28C76F',
  overlay: 'rgba(245,247,251,0.94)'
};

const dark = {
  background: '#050506',
  surface: '#111113',
  elevated: 'rgba(28,28,30,0.97)',
  text: '#F5F5F7',
  muted: '#A1A1AA',
  faint: '#71717A',
  line: 'rgba(255,255,255,0.11)',
  blue: '#0A84FF',
  danger: '#FF453A',
  success: '#30D158',
  overlay: 'rgba(5,5,6,0.94)'
};

export function createPalette(mode, armed = false) {
  const base = mode === 'dark' ? dark : light;
  const accent = armed ? base.danger : base.blue;
  return {
    ...base,
    accent,
    accentQuiet: armed ? 'rgba(217,52,63,0.14)' : 'rgba(0,122,255,0.13)',
    accentLine: armed ? 'rgba(217,52,63,0.30)' : 'rgba(0,122,255,0.26)'
  };
}

export const colors = {
  background: '#F7F8FF',
  surface: '#FFFFFF',
  surfaceSubtle: '#ECEEFF',
  primary: '#5B6FE8',
  primaryPressed: '#3D50CC',
  text: '#1A1A2E',
  textMuted: '#7B82A8',
  border: '#DDE0F5',
  success: '#2ECC71',
  warning: '#A85D00',
  danger: '#DC2626',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const typography = {
  heading: 'Nunito',
  body: 'Inter',
} as const;

export const minimumTouchTarget = 48;

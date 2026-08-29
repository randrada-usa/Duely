export const colors = {
  background: '#F5F7FC',
  surface: '#FFFFFF',
  surfaceSubtle: '#EEF1FF',
  primary: '#4657C5',
  primaryPressed: '#3544A8',
  primarySoft: '#E9ECFF',
  primaryFaint: '#F4F5FF',
  text: '#202035',
  textMuted: '#697089',
  textSubtle: '#9AA1B5',
  border: '#D9DEEA',
  borderStrong: '#C8CFDF',
  success: '#2CCB72',
  successSoft: '#E5F8EC',
  warning: '#A85D00',
  warningSoft: '#FFF3DA',
  danger: '#F24E59',
  dangerSoft: '#FFE8EA',
  navy: '#1E2036',
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
  lg: 18,
  xl: 26,
  full: 999,
} as const;

export const typography = {
  heading: 'Nunito_700Bold',
  headingStrong: 'Nunito_800ExtraBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

export const minimumTouchTarget = 48;

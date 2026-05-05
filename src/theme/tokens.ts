// XO Play design tokens — Spec_DesignSystem.md §3 (v0.2).
// True-neutral grayscale, desaturated status, muted positions, committed type
// scale built on Barlow / Barlow Condensed / JetBrains Mono.
// Font family strings reference the names registered by useFonts() in
// app/_layout.tsx — RN reads weight from the family, do not also set fontWeight.

export const gray = {
  0: '#ffffff',
  25: '#fbfbfb',
  50: '#f6f6f6',
  100: '#ededed',
  200: '#dcdcdc',
  300: '#c4c4c4',
  400: '#a0a0a0',
  500: '#767676',
  600: '#565656',
  700: '#3d3d3d',
  800: '#262626',
  900: '#141414',
  950: '#0a0a0a',
} as const;

export type GrayStep = keyof typeof gray;

export const status = {
  success: '#1d7d4c',
  successBg: '#e8f1ec',
  warning: '#9c6a00',
  warningBg: '#f6eedd',
  error: '#b82727',
  errorBg: '#f6e4e4',
  info: '#2c5d8f',
  live: '#d81c1c',
} as const;

export const position = {
  QB: '#b8446b',
  RB: '#1f7a4c',
  WR: '#2656a5',
  TE: '#b36a1a',
  K: '#6e4a9a',
  DEF: '#4a4a4a',
  FLEX: '#565656',
} as const;

export type Position = keyof typeof position;

// Spec §3.5 — Q reuses status.warning, D and O reuse status.error,
// IR reuses gray.900. Listed here as their own tokens for usage clarity.
export const injury = {
  Q: status.warning,
  D: status.error,
  O: status.error,
  IR: gray[900],
} as const;

export type InjuryStatus = keyof typeof injury;

export const radius = {
  none: 0,
  sm: 3,
  md: 6,
  lg: 10,
  xl: 16,
  full: 999,
} as const;

// Spec §3.7 documents 5 informal levels (~4/~8/~16/~24-32/~40-48). The build
// brief formalizes them on a 4px base with explicit xxl/xxxl/xxxxl extensions.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  xxxxl: 48,
} as const;

export type SpacingKey = keyof typeof spacing;

// expo-google-fonts loaded family names. The weight is encoded in the family,
// so consumers must NOT also pass fontWeight — RN-Web would otherwise miss the
// @font-face match and fall back to a default.
export const fontFamily = {
  barlow: {
    light: 'Barlow_300Light',
    regular: 'Barlow_400Regular',
    italic: 'Barlow_400Regular_Italic',
    medium: 'Barlow_500Medium',
    semibold: 'Barlow_600SemiBold',
    bold: 'Barlow_700Bold',
  },
  barlowCondensed: {
    medium: 'BarlowCondensed_500Medium',
    semibold: 'BarlowCondensed_600SemiBold',
    bold: 'BarlowCondensed_700Bold',
  },
  jetbrainsMono: {
    regular: 'JetBrainsMono_400Regular',
    medium: 'JetBrainsMono_500Medium',
  },
} as const;

export type TypeStyle = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  textTransform: 'none' | 'uppercase';
  fontVariant?: ('tabular-nums')[];
};

// Spec §3.8 — committed type scale. Line-heights stored as RN-ready px values
// (size * spec ratio, rounded). Data/stat tokens carry tabular-nums per the
// "data values always use fontVariantNumeric: 'tabular-nums'" mandatory rule.
export const type = {
  displayXxl: {
    fontFamily: fontFamily.barlowCondensed.bold,
    fontSize: 280,
    lineHeight: 224,
    letterSpacing: -6,
    textTransform: 'uppercase',
  },
  displayXl: {
    fontFamily: fontFamily.barlowCondensed.bold,
    fontSize: 96,
    lineHeight: 82,
    letterSpacing: -2,
    textTransform: 'uppercase',
  },
  displayLg: {
    fontFamily: fontFamily.barlowCondensed.bold,
    fontSize: 88,
    lineHeight: 77,
    letterSpacing: -1.5,
    textTransform: 'uppercase',
  },
  displayMd: {
    fontFamily: fontFamily.barlowCondensed.bold,
    fontSize: 72,
    lineHeight: 65,
    letterSpacing: -1.5,
    textTransform: 'uppercase',
  },
  displaySm: {
    fontFamily: fontFamily.barlowCondensed.bold,
    fontSize: 64,
    lineHeight: 58,
    letterSpacing: -1,
    textTransform: 'uppercase',
  },
  headlineLg: {
    fontFamily: fontFamily.barlowCondensed.bold,
    fontSize: 52,
    lineHeight: 49,
    letterSpacing: -0.5,
    textTransform: 'none',
  },
  headlineMd: {
    fontFamily: fontFamily.barlowCondensed.bold,
    fontSize: 38,
    lineHeight: 38,
    letterSpacing: -0.5,
    textTransform: 'uppercase',
  },
  headlineSm: {
    fontFamily: fontFamily.barlowCondensed.bold,
    fontSize: 24,
    lineHeight: 24,
    letterSpacing: -0.2,
    textTransform: 'none',
  },
  headlineXs: {
    fontFamily: fontFamily.barlowCondensed.bold,
    fontSize: 22,
    lineHeight: 22,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  statXl: {
    fontFamily: fontFamily.barlowCondensed.bold,
    fontSize: 72,
    lineHeight: 65,
    letterSpacing: -1,
    textTransform: 'none',
    fontVariant: ['tabular-nums'],
  },
  statLg: {
    fontFamily: fontFamily.barlowCondensed.bold,
    fontSize: 44,
    lineHeight: 44,
    letterSpacing: -0.5,
    textTransform: 'none',
    fontVariant: ['tabular-nums'],
  },
  statMd: {
    fontFamily: fontFamily.barlowCondensed.bold,
    fontSize: 40,
    lineHeight: 36,
    letterSpacing: -0.5,
    textTransform: 'none',
    fontVariant: ['tabular-nums'],
  },
  bodyLg: {
    fontFamily: fontFamily.barlow.regular,
    fontSize: 18,
    lineHeight: 27,
    letterSpacing: 0,
    textTransform: 'none',
  },
  body: {
    fontFamily: fontFamily.barlow.regular,
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: 0,
    textTransform: 'none',
  },
  bodySm: {
    fontFamily: fontFamily.barlow.light,
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: 0,
    textTransform: 'none',
  },
  bodyXs: {
    fontFamily: fontFamily.barlow.regular,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0,
    textTransform: 'none',
  },
  dataMd: {
    fontFamily: fontFamily.barlowCondensed.semibold,
    fontSize: 18,
    lineHeight: 23,
    letterSpacing: 0,
    textTransform: 'none',
    fontVariant: ['tabular-nums'],
  },
  data: {
    fontFamily: fontFamily.barlowCondensed.medium,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0,
    textTransform: 'none',
    fontVariant: ['tabular-nums'],
  },
  dataSm: {
    fontFamily: fontFamily.barlowCondensed.medium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
    textTransform: 'none',
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontFamily: fontFamily.barlowCondensed.semibold,
    fontSize: 13,
    lineHeight: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  labelSm: {
    fontFamily: fontFamily.barlowCondensed.bold,
    fontSize: 11,
    lineHeight: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  mono: {
    fontFamily: fontFamily.jetbrainsMono.regular,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
} satisfies Record<string, TypeStyle>;

export type TypeToken = keyof typeof type;

/**
 * Locked in — design tokens.
 * Every color, spacing and radius used in the app lives here,
 * so changing the brand look only means editing this one file.
 */

export const Colors = {
  // Brand
  lime: '#A3FF3F', // Neon Lime (primary)
  limeSoft: 'rgba(163, 255, 63, 0.14)',
  limeBorder: 'rgba(163, 255, 63, 0.35)',
  background: '#111111', // Midnight Black

  // Surfaces
  card: '#1A1A1A',
  cardRaised: '#222222',
  border: '#2A2A2A',

  // Text
  text: '#FFFFFF',
  textMuted: '#8A8A8A',
  textFaint: '#5A5A5A',

  // Macros
  protein: '#A3FF3F',
  carbs: '#4FD1FF',
  fat: '#FFB23F',

  danger: '#FF5A5A',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
} as const;

export const Type = {
  hero: { fontSize: 44, fontWeight: '800' as const, letterSpacing: -1 },
  title: { fontSize: 26, fontWeight: '800' as const, letterSpacing: -0.5 },
  heading: { fontSize: 18, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '500' as const },
  label: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.4 },
} as const;

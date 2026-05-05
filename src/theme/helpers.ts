// Spec_DesignSystem.md §8.3 — color-safety algorithms. Every franchise-aware
// component must use these to pick on-color text and to flag near-white /
// near-black franchise colors that need a contextual border.

import { gray } from './tokens';

const parseHex = (hex: string): { r: number; g: number; b: number } => {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
};

const luminance = (hex: string): number => {
  const { r, g, b } = parseHex(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};

// onColor — perceptual brightness test (NOT WCAG contrast). Threshold 0.62
// was tuned on the five sample franchises. Returns gray.950 for dark text or
// pure white for light text.
export const onColor = (hex: string): typeof gray[950] | '#ffffff' =>
  luminance(hex) > 0.62 ? gray[950] : '#ffffff';

export type SafeBlockResult = {
  color: string;
  veryLight: boolean;
  veryDark: boolean;
  lum: number;
};

// safeBlock — flags edge-case franchise colors so the caller can add a
// contextual border (very light) or accept that no border is needed (very
// dark on light surfaces). The original color is returned unchanged; the
// system never auto-adjusts a user's chosen franchise color.
export const safeBlock = (hex: string): SafeBlockResult => {
  const lum = luminance(hex);
  return {
    color: hex,
    veryLight: lum > 0.85,
    veryDark: lum < 0.12,
    lum,
  };
};

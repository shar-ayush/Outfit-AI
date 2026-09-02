// src/theme/colors.js
//
// Source of truth: Stitch export `haute_systems/DESIGN.md`
// "Haute Systems" — Editorial Minimalism design language.
// Monochromatic base + a single restrained gold "prestige" accent.
// Keep names 1:1 with the DESIGN.md token names (kebab -> camel) so
// it's trivial to cross-reference a Stitch screen against this file.

export const colors = {
  // ── Surfaces ──────────────────────────────────────────────
  surface: '#F9F9F9',
  surfaceDim: '#DADADA',
  surfaceBright: '#F9F9F9',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F3F3F3',
  surfaceContainer: '#EEEEEE',
  surfaceContainerHigh: '#E8E8E8',
  surfaceContainerHighest: '#E2E2E2',
  surfaceVariant: '#E2E2E2',

  // ── On-surface (text/icons over surfaces) ────────────────
  onSurface: '#1A1C1C',
  onSurfaceVariant: '#444748',
  inverseSurface: '#2F3131',
  inverseOnSurface: '#F1F1F1',

  // ── Outline / borders ─────────────────────────────────────
  outline: '#747878',
  outlineVariant: '#C4C7C7',
  surfaceTint: '#5F5E5E',

  // ── Primary — deep charcoal / near-black ──────────────────
  primary: '#000000',
  onPrimary: '#FFFFFF',
  primaryContainer: '#1C1B1B',
  onPrimaryContainer: '#858383',
  inversePrimary: '#C8C6C5',
  primaryFixed: '#E5E2E1',
  primaryFixedDim: '#C8C6C5',
  onPrimaryFixed: '#1C1B1B',
  onPrimaryFixedVariant: '#474746',

  // ── Secondary — mid greys ─────────────────────────────────
  secondary: '#5E5E5E',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#E1DFDF',
  onSecondaryContainer: '#626262',
  secondaryFixed: '#E4E2E2',
  secondaryFixedDim: '#C7C6C6',
  onSecondaryFixed: '#1B1C1C',
  onSecondaryFixedVariant: '#464747',

  // ── Tertiary — warm gold "prestige" accent ────────────────
  // Use sparingly: AI badges, verified/premium markers, single CTAs.
  tertiary: '#755B00',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#C9A84C',
  onTertiaryContainer: '#503D00',
  tertiaryFixed: '#FFE08F',
  tertiaryFixedDim: '#E6C364',
  onTertiaryFixed: '#241A00',
  onTertiaryFixedVariant: '#584400',
  // Convenience aliases used across AI-badge components:
  goldAccent: '#C9A84C',
  goldAccentLight: '#F5EDD4',

  // ── Semantic ───────────────────────────────────────────────
  error: '#BA1A1A',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#93000A',

  // Desaturated semantic helpers (score bars, ROI indicators etc.)
  // Kept muted intentionally so they never fight the monochrome palette.
  success: '#2D6A4F',
  warning: '#E65100',
  info: '#1565C0',
  scoreHigh: '#2D6A4F',
  scoreMedium: '#E65100',
  scoreLow: '#BA1A1A',

  // ── Background ─────────────────────────────────────────────
  background: '#F9F9F9',
  onBackground: '#1A1C1C',

  // ── Vibe colours — map to `vibe` string returned by backend ─
  vibeMinimal: '#5E5E5E',
  vibeBold: '#BA1A1A',
  vibeClassic: '#1565C0',
  vibeRelaxed: '#2D6A4F',
  vibeSharp: '#000000',
  vibeEffortless: '#C9A84C',
}

export default colors

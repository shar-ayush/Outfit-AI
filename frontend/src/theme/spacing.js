// src/theme/spacing.js
//
// 4px baseline grid per DESIGN.md. Favor generous open space over density.

export const spacing = {
  unit: 4,
  gutter: 16,           // standard horizontal gutter on mobile
  containerPadding: 24, // outer screen padding (desktop-leaning, use sparingly on mobile)

  // Named stack spacing — use between sections
  stackXs: 4,
  stackSm: 8,
  stackMd: 16,
  stackLg: 32,
  stackXl: 48,
}

// Corner radius scale — matches DESIGN.md `rounded` tokens
export const radius = {
  sm: 4,     // 0.25rem — small elements
  DEFAULT: 8,  // 0.5rem — buttons/inputs (see DESIGN.md "Buttons/Inputs")
  md: 12,    // 0.75rem
  lg: 16,    // 1rem — cards/containers
  xl: 24,    // 1.5rem — larger cards, sheets
  full: 9999, // pills/chips/avatars
}

export default spacing

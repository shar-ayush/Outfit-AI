// src/theme/typography.js
//
// Font: Inter exclusively (per DESIGN.md — "clean, systematic, modern").
// Load weights via @expo-google-fonts/inter in app/_layout.jsx:
//   Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold
//
// Hierarchy is driven by weight + letter-spacing, not just size.
// Headlines use tight/negative tracking for a "compressed" fashion-tech feel.
// `display-lg` scales down to 28px on mobile per DESIGN.md — since this is
// a mobile-only app, we use the mobile value directly as displayLg.

export const typography = {
  // Display — large hero text (mobile-scaled per DESIGN.md)
  displayLg: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  displayMd: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.2,
  },

  // Headings
  headlineSm: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
  },
  titleMd: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    lineHeight: 24,
  },
  titleSm: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    lineHeight: 22,
  },

  // Body
  bodyLg: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  bodyMd: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },

  // Labels — small caps, generous tracking. Used for tags/chips/section headers.
  labelCaps: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.9, // ~0.08em at 11px
    textTransform: 'uppercase',
  },
  labelMd: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
  },

  // Caption — smallest meta text (timestamps, helper text)
  caption: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 16,
  },
}

// Font map for useFonts() in root layout
export const fontsToLoad = {
  Inter_400Regular: 'Inter_400Regular',
  Inter_500Medium: 'Inter_500Medium',
  Inter_600SemiBold: 'Inter_600SemiBold',
  Inter_700Bold: 'Inter_700Bold',
}

export default typography

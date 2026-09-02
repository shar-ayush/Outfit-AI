// src/theme/shadows.js
//
// Per DESIGN.md "Elevation & Depth": prefer Tonal Layering (subtle surface
// color shifts) over heavy dropshadows. When true elevation is needed
// (FABs, modal cards, floating outfit cards), use a "Cloud Shadow" —
// very soft, diffused, 16-24px blur, ~4% opacity of Primary (#000000).
//
// React Native shadow props differ between iOS (shadowColor/Offset/
// Opacity/Radius) and Android (elevation). We provide both so a single
// spread works cross-platform: style={[styles.card, shadows.sm]}

import { Platform } from 'react-native'

const cloudShadow = (radius, opacity, elevation) =>
  Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: radius / 4 },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
    android: {
      elevation,
    },
    default: {},
  })

export const shadows = {
  none: {},

  // Subtle lift — list rows, chips that need to read as tappable
  xs: cloudShadow(4, 0.04, 1),

  // Standard card elevation — ClothCard, OutfitCard, StatCard
  sm: cloudShadow(12, 0.04, 2),

  // Elevated surfaces — bottom sheets, floating outfit carousel cards
  md: cloudShadow(20, 0.05, 4),

  // Modals, FAB, top-level overlays
  lg: cloudShadow(24, 0.06, 8),
}

export default shadows

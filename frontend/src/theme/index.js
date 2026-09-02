// src/theme/index.js
//
// Single import point for the whole design system:
//   import { theme } from '@/theme'
//   <Text style={theme.typography.h1}>
//
// Also exports each piece individually for destructured imports:
//   import { colors, typography } from '@/theme'

import { colors } from './colors'
import { typography, fontsToLoad } from './typography'
import { spacing, radius } from './spacing'
import { shadows } from './shadows'

export const theme = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
}

export { colors, typography, fontsToLoad, spacing, radius, shadows }

export default theme

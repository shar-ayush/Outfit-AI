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

  xs: cloudShadow(4, 0.04, 1),

  sm: cloudShadow(12, 0.04, 2),

  md: cloudShadow(20, 0.05, 4),

  lg: cloudShadow(24, 0.06, 8),
}

export default shadows

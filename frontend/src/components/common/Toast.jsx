// src/components/common/Toast.jsx
//
// Presentational toast — purely controlled via props. In Step 4 (stores) we
// wire a <ToastHost /> at the root layout that reads uiStore.toast and
// renders this; keeping this component prop-driven means it has no
// dependency on the store and is easy to test/reuse standalone.
//
// Usage (once wired to uiStore):
//   <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />

import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from './Text';
import { colors, radius, spacing, shadows } from '@/theme';

const ICONS = {
  success: { name: 'check-circle', color: colors.success },
  error: { name: 'alert-circle', color: colors.error },
  info: { name: 'information', color: colors.info },
  offline: { name: 'wifi-off', color: colors.secondary },
};

export default function Toast({ visible, message, type = 'info', duration = 2500, onHide }) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-80);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: 250 });
      opacity.value = withTiming(1, { duration: 250 });

      translateY.value = withDelay(
        duration,
        withTiming(-80, { duration: 200 }, (finished) => {
          if (finished && onHide) runOnJS(onHide)();
        })
      );
      opacity.value = withDelay(duration, withTiming(0, { duration: 200 }));
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  const icon = ICONS[type] || ICONS.info;

  return (
    <Animated.View
      style={[styles.container, { top: insets.top + 8 }, shadows.md, animatedStyle]}
      pointerEvents="none"
    >
      <MaterialCommunityIcons name={icon.name} size={18} color={icon.color} />
      <Text variant="bodyMd" style={styles.text} numberOfLines={2}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.gutter,
    right: spacing.gutter,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inverseSurface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.stackMd,
    paddingVertical: 12,
  },
  text: { color: colors.inverseOnSurface, marginLeft: spacing.stackSm, flex: 1 },
});

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, radius, spacing } from '@/theme';

export function SkeletonLoader({ width = '100%', height = 16, style, borderRadius = radius.sm }) {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: borderRadius, backgroundColor: colors.surfaceContainer },
        animatedStyle,
        style,
      ]}
    />
  );
}

export function SkeletonCard({ style }) {
  return (
    <View style={[styles.cardContainer, style]}>
      <SkeletonLoader height={160} borderRadius={radius.lg} />
      <View style={styles.cardMeta}>
        <SkeletonLoader width="70%" height={12} />
        <SkeletonLoader width="40%" height={10} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

export function SkeletonOutfitCard({ style }) {
  return (
    <View style={[styles.outfitCardContainer, style]}>
      <SkeletonLoader height={220} borderRadius={radius.lg} />
      <SkeletonLoader width="50%" height={16} style={{ marginTop: spacing.stackMd }} />
      <SkeletonLoader width="90%" height={12} style={{ marginTop: spacing.stackSm }} />
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: { flex: 1 },
  cardMeta: { paddingTop: spacing.stackSm },
  outfitCardContainer: { padding: spacing.gutter },
});

export default SkeletonLoader;

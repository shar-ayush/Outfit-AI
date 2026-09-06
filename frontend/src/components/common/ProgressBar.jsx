// src/components/common/ProgressBar.jsx
//
// Thin pill progress bar — used for onboarding quiz steps (style_quiz_step_1
// shows "h-1 bg-surface-container-high rounded-full" with a black fill),
// upload progress, and the "learning phase % complete" bar on the style
// preferences screen.
//
// Usage:
//   <ProgressBar progress={0.25} />                    — 25%, default black fill
//   <ProgressBar progress={0.4} color="goldAccent" />  — gold fill (learning phase)

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { colors, radius } from '@/theme';

export default function ProgressBar({ progress = 0, color = 'primary', height = 4, style }) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(Math.max(0, Math.min(1, progress)) * 100, { duration: 400 });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({ width: `${width.value}%` }));

  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }, style]}>
      <Animated.View
        style={[
          styles.fill,
          { backgroundColor: colors[color] || color, borderRadius: height / 2 },
          animatedStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: colors.surfaceContainerHigh,
    overflow: 'hidden',
  },
  fill: { height: '100%' },
});

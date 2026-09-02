// src/components/common/Badge.jsx
//
// Small circular/pill status indicators — distinct from Tag (which is for
// filters/categories). Used for: checkmark-on-select overlays (onboarding
// quiz grids), notification dots, plan status (Planned/Worn/Skipped),
// never-worn red indicator dots.
//
// Usage:
//   <Badge type="check" />                     — gold checkmark circle (quiz selection)
//   <Badge type="dot" color="error" />          — small status dot
//   <Badge type="status" label="Worn" tone="success" />  — status pill (planner)

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Text from './Text';
import { colors, radius } from '@/theme';

const STATUS_TONES = {
  success: { bg: '#E3EFE9', text: 'success' },   // worn
  neutral: { bg: colors.surfaceContainer, text: 'onSurfaceVariant' }, // planned
  error: { bg: '#FBE4E2', text: 'error' },        // skipped/rejected
  gold: { bg: colors.goldAccentLight, text: 'onTertiaryContainer' }, // AI/premium
};

export default function Badge({ type = 'dot', color = 'error', label, tone = 'neutral', style }) {
  if (type === 'check') {
    return (
      <View style={[styles.checkCircle, style]}>
        <MaterialCommunityIcons name="check-bold" size={13} color={colors.onTertiaryContainer} />
      </View>
    );
  }

  if (type === 'status') {
    const t = STATUS_TONES[tone] || STATUS_TONES.neutral;
    return (
      <View style={[styles.statusPill, { backgroundColor: t.bg }, style]}>
        <Text variant="labelCaps" color={t.text}>
          {label}
        </Text>
      </View>
    );
  }

  // 'dot'
  return (
    <View
      style={[
        styles.dot,
        { backgroundColor: colors[color] || color },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    backgroundColor: colors.goldAccent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
});

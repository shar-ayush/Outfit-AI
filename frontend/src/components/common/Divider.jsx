// src/components/common/Divider.jsx
//
// Simple 1px separator line — DESIGN.md "Lists": clean separators using
// 1px #E8E8E8 lines.

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '@/theme';

export default function Divider({ inset = false, style }) {
  return (
    <View
      style={[
        styles.line,
        inset && { marginLeft: spacing.gutter },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  line: {
    height: StyleSheet.hairlineWidth * 2, // ~1px, crisp on all densities
    backgroundColor: colors.surfaceContainerHigh, // #E8E8E8
    width: '100%',
  },
});

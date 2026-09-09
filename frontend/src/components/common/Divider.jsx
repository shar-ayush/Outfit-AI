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
    height: StyleSheet.hairlineWidth * 2,
    backgroundColor: colors.surfaceContainerHigh,
    width: '100%',
  },
});

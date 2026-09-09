import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radius, spacing, shadows } from '@/theme';

export default function Card({
  children,
  elevated = false,
  noPadding = false,
  style,
  ...rest
}) {
  return (
    <View
      style={[
        styles.base,
        elevated ? shadows.sm : styles.bordered,
        !noPadding && styles.padded,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  bordered: {
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
  },
  padded: {
    padding: spacing.gutter,
  },
});

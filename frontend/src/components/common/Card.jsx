// src/components/common/Card.jsx
//
// Per DESIGN.md "Cards": white bg, 16px corner radius, 1px subtle border
// OR very light ambient shadow (not both, usually — pick via `elevated` prop).
//
// Usage:
//   <Card>...</Card>                — bordered, flat (default; list-context cards)
//   <Card elevated>...</Card>       — shadow instead of border (floating cards, e.g. OutfitCard)
//   <Card noPadding><Image .../></Card> — edge-to-edge image content

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
    // DESIGN.md specifies #E8E8E8 for card borders — matches surfaceContainerHigh exactly
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
  },
  padded: {
    padding: spacing.gutter,
  },
});

// src/components/analytics/WearFrequencyBar.jsx
//
// Backed by GET /api/analytics/wear-frequency's real `mostWorn` array.
// Bar width is each item's wearCount relative to the max in the list —
// a real relative comparison, not a fabricated scale.

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@/components/common/Text';
import { colors, spacing, radius } from '@/theme';

export default function WearFrequencyBar({ items = [] }) {
  if (items.length === 0) return null;
  const maxCount = Math.max(...items.map((i) => i.wearCount || 0), 1);

  return (
    <View style={styles.container}>
      {items.map((item) => (
        <View key={item._id} style={styles.row}>
          <Text variant="bodyMd" numberOfLines={1} style={styles.label}>
            {item.name || item.subCategory}
          </Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${(item.wearCount / maxCount) * 100}%` }]} />
          </View>
          <Text variant="caption" color="secondary" style={styles.count}>
            {item.wearCount}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.stackSm },
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { width: 96 },
  track: {
    flex: 1,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerHigh,
    overflow: 'hidden',
    marginHorizontal: spacing.stackSm,
  },
  fill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.full },
  count: { width: 24, textAlign: 'right' },
});

// src/components/analytics/StatCard.jsx

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@/components/common/Text';
import { colors, spacing, radius } from '@/theme';

export default function StatCard({ label, value, tone }) {
  return (
    <View style={styles.card}>
      <Text variant="bodyMd" color="secondary">{label}</Text>
      <Text variant="displayMd" color={tone || 'onSurface'} style={styles.value}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '47%',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.lg,
    padding: spacing.stackMd,
  },
  value: { marginTop: 4 },
});

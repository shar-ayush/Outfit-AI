// src/components/cloth/ClothStats.jsx
//
// Matches item_detail's "Stats Bento Grid": 2x2 grid — wear count, cost
// per wear, preference score (bar + affinity label), days since worn.

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@/components/common/Text';
import ProgressBar from '@/components/common/ProgressBar';
import { colors, spacing, radius } from '@/theme';
import { daysSince } from '@/utils/dateUtils';

function affinityLabel(score) {
  if (score == null) return 'NOT ENOUGH DATA';
  if (score >= 0.7) return 'HIGH AFFINITY';
  if (score >= 0.4) return 'MODERATE AFFINITY';
  return 'LOW AFFINITY';
}

export default function ClothStats({ cloth }) {
  const days = daysSince(cloth.lastWornAt);
  const score = cloth.preference?.score;

  return (
    <View style={styles.grid}>
      <View style={styles.cell}>
        <Text variant="bodyMd" color="secondary">Wear Count</Text>
        <Text variant="displayMd" style={styles.value}>{cloth.wearCount || 0}</Text>
      </View>

      <View style={styles.cell}>
        <Text variant="bodyMd" color="secondary">Cost Per Wear</Text>
        <Text variant="displayMd" style={styles.value}>
          {cloth.purchasePrice
            ? `${cloth.purchaseCurrency || ''} ${cloth.costPerWear ?? cloth.purchasePrice}`
            : '—'}
        </Text>
      </View>

      <View style={[styles.cell, styles.wideCell]}>
        <Text variant="bodyMd" color="secondary" style={styles.scoreLabel}>Preference Score</Text>
        <ProgressBar progress={score || 0} height={8} />
        <Text variant="labelCaps" style={styles.affinityLabel}>{affinityLabel(score)}</Text>
      </View>

      <View style={[styles.cell, styles.wideCell]}>
        <Text variant="bodyMd" color="secondary">Days Since Worn</Text>
        <Text variant="displayMd" style={styles.value}>{days ?? '—'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.stackMd },
  cell: {
    width: '47%',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.stackMd,
    justifyContent: 'center',
  },
  wideCell: { width: '47%' },
  value: { marginTop: 4 },
  scoreLabel: { marginBottom: spacing.stackSm },
  affinityLabel: { marginTop: spacing.stackSm },
});

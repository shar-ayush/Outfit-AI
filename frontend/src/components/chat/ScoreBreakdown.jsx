import React from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@/components/common/Text';
import { colors, spacing } from '@/theme';

function ScoreRow({ label, value }) {
  const clamped = Math.max(0, Math.min(100, value ?? 0));
  return (
    <View style={styles.row}>
      <Text variant="caption" color="secondary" style={styles.rowLabel}>
        {label}
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${clamped}%` }]} />
      </View>
      <Text variant="caption" color="secondary" style={styles.rowValue}>
        {clamped}
      </Text>
    </View>
  );
}

export default function ScoreBreakdown({ score }) {
  if (!score) return null;

  const freshness = score.noveltyPenalty != null ? 100 - score.noveltyPenalty : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="labelCaps" color="secondary">Match Score</Text>
        <Text variant="titleSm">{score.total}/100</Text>
      </View>
      <ScoreRow label="Compatibility" value={score.algorithm} />
      <ScoreRow label="Personalized to you" value={score.personalization} />
      {freshness != null && <ScoreRow label="Freshness" value={freshness} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowLabel: { width: 108 },
  track: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceContainerHigh,
    overflow: 'hidden',
    marginHorizontal: spacing.stackSm,
  },
  fill: { height: '100%', backgroundColor: colors.primary, borderRadius: 2 },
  rowValue: { width: 24, textAlign: 'right' },
});

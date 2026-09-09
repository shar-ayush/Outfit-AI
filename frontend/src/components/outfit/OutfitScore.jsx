import React from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@/components/common/Text';
import { colors, spacing } from '@/theme';

const CATEGORIES = [
  { key: 'color', label: 'Color' },
  { key: 'style', label: 'Style' },
  { key: 'formality', label: 'Formality' },
  { key: 'occasion', label: 'Occasion' },
  { key: 'pattern', label: 'Pattern' },
];

function ScoreRow({ label, value }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <View style={styles.row}>
      <Text variant="bodyMd" color="secondary" style={styles.rowLabel}>{label}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${clamped}%` }]} />
      </View>
      <Text variant="caption" color="secondary" style={styles.rowValue}>{clamped}</Text>
    </View>
  );
}

export default function OutfitScore({ scoreBreakdown }) {
  const hasData = scoreBreakdown && CATEGORIES.some((c) => scoreBreakdown[c.key] != null);
  if (!hasData) return null;

  return (
    <View style={styles.container}>
      <Text variant="titleSm" style={styles.title}>Compatibility Breakdown</Text>
      {CATEGORIES.map(
        (cat) =>
          scoreBreakdown[cat.key] != null && (
            <ScoreRow key={cat.key} label={cat.label} value={scoreBreakdown[cat.key]} />
          )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.stackLg },
  title: { marginBottom: spacing.stackSm },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  rowLabel: { width: 80 },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceContainerHigh,
    overflow: 'hidden',
    marginHorizontal: spacing.stackSm,
  },
  fill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  rowValue: { width: 24, textAlign: 'right' },
});
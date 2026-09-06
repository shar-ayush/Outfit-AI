// src/components/chat/ScoreBreakdown.jsx
//
// BACKEND-GROUNDED: this is not decorative. The recommendation pipeline
// (compatibilityScorer -> personalizationService -> noveltyService ->
// rankingService) produces a real score object on every outfit:
//   { total, algorithm, personalization, noveltyPenalty, pairsScored }
// See backend/src/services/recommendation/*.js. This component is the one
// place in the app that makes that pipeline visible instead of collapsing
// it into a single opaque number.
//
// `algorithm`       - the compatibility score (color/pattern/style/formality/
//                      occasion matching) BEFORE personalization is blended in.
// `personalization` - how well this matches the user's learned preferences
//                      (ItemPreference/PairPreference/ContextPreference).
// `noveltyPenalty`  - % the score was reduced for containing recently-shown
//                      or recently-worn items. We invert it to "Freshness"
//                      for display since a bigger number reading as "better"
//                      is more intuitive than a bigger number reading as
//                      "more penalized."

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

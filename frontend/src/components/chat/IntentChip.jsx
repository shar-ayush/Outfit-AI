// src/components/chat/IntentChip.jsx
//
// BACKEND-GROUNDED: renders the real `intent` object returned alongside
// outfit results — { occasions, formality, isRefinement,
// refinementInstruction } — extracted server-side by
// backend/src/services/ai/intentService.js. This makes the AI's
// interpretation of the user's message visible and correctable, which
// matters most on refinements ("make it more casual" only makes sense to
// the user if they can see what changed).

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Text from '@/components/common/Text';
import { colors, radius, spacing } from '@/theme';

export default function IntentChip({ intent }) {
  if (!intent) return null;

  const parts = [intent.occasions, intent.formality].filter(Boolean);
  if (parts.length === 0 && !intent.isRefinement) return null;

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons
        name={intent.isRefinement ? 'autorenew' : 'text-search'}
        size={12}
        color={colors.secondary}
      />
      <Text variant="caption" color="secondary" style={styles.text}>
        {intent.isRefinement
          ? `Refining: ${intent.refinementInstruction || 'previous request'}`
          : `Understood as: ${parts.join(' · ')}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.full,
    paddingHorizontal: spacing.stackSm,
    paddingVertical: 4,
    marginBottom: spacing.stackSm,
    gap: 4,
  },
  text: { textTransform: 'capitalize' },
});

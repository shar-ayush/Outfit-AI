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

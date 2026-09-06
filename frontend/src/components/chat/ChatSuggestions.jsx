// src/components/chat/ChatSuggestions.jsx

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Text from '@/components/common/Text';
import { QUICK_PROMPTS } from '@/constants/prompts';
import { colors, radius, spacing } from '@/theme';

export default function ChatSuggestions({ onSelect }) {
  return (
    <View style={styles.grid}>
      {QUICK_PROMPTS.map((prompt) => (
        <Pressable key={prompt.label} style={styles.chip} onPress={() => onSelect(prompt.query)}>
          <Text variant="bodyMd">
            {prompt.label} {prompt.emoji}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.stackSm, justifyContent: 'center' },
  chip: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.full,
    paddingHorizontal: spacing.stackMd,
    paddingVertical: 10,
  },
});

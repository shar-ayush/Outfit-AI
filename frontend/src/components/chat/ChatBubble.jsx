// src/components/chat/ChatBubble.jsx
//
// Plain text message bubble — used for user messages and for assistant
// text answers (backend's `type: 'text'` response for fashion questions,
// as opposed to `type: 'outfits'` which renders ChatOutfitCard instead).

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@/components/common/Text';
import { colors, radius, spacing } from '@/theme';

export default function ChatBubble({ role, content }) {
  const isUser = role === 'user';

  return (
    <View style={[styles.row, isUser ? styles.rowRight : styles.rowLeft]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        <Text variant="bodyLg" color={isUser ? 'onPrimary' : 'onSurface'}>
          {content}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: spacing.stackMd },
  rowRight: { justifyContent: 'flex-end' },
  rowLeft: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '80%',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.stackMd,
    paddingVertical: 10,
  },
  userBubble: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  assistantBubble: {
    backgroundColor: colors.surfaceContainerLow,
    borderBottomLeftRadius: 4,
  },
});

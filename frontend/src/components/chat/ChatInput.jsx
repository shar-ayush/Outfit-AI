// src/components/chat/ChatInput.jsx
//
// Backend caps messages at 500 chars (see stylistController.js validation)
// — enforced here client-side too so the user gets immediate feedback
// instead of a 400 response.

import React, { useState } from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme';

const MAX_LENGTH = 500;

export default function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <View style={styles.container}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Describe your occasion..."
        placeholderTextColor={colors.secondaryFixedDim}
        style={styles.input}
        multiline
        maxLength={MAX_LENGTH}
        editable={!disabled}
      />
      <Pressable
        onPress={handleSend}
        disabled={!text.trim() || disabled}
        style={[styles.sendButton, (!text.trim() || disabled) && styles.sendButtonDisabled]}
      >
        <MaterialCommunityIcons name="arrow-up" size={18} color={colors.onPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.stackSm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerHigh,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.stackMd,
    paddingVertical: 10,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: colors.onSurface,
    marginRight: spacing.stackSm,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { backgroundColor: colors.surfaceContainerHigh },
});

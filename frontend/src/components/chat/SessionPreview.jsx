// src/components/chat/SessionPreview.jsx
//
// Backend's getUserSessions returns { messages, shownItemIds, lastIntent,
// updatedAt, messageCount, lastMessage } (see stylistService.js) — every
// field used here is real.

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Text from '@/components/common/Text';
import { formatRelativeDate } from '@/utils/dateUtils';
import { colors, radius, spacing } from '@/theme';

export default function SessionPreview({ session, onPress }) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.iconCircle}>
        <MaterialCommunityIcons name="creation" size={18} color={colors.goldAccent} />
      </View>
      <View style={styles.info}>
        <Text variant="titleSm" numberOfLines={1}>
          {session.lastMessage || 'New conversation'}
        </Text>
        <Text variant="bodyMd" color="secondary" numberOfLines={1}>
          {session.messageCount} messages · {formatRelativeDate(session.updatedAt)}
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.secondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.stackMd,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHigh,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.goldAccentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.stackMd,
  },
  info: { flex: 1, marginRight: spacing.stackSm },
});

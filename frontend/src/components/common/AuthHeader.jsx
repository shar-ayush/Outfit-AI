// src/components/common/AuthHeader.jsx
//
// Exact match to the header markup shared by login_screen and
// register_screen: back button (left), centered "OUTFIT AI" wordmark,
// equal-width spacer (right) so the wordmark stays visually centered.
//
// Not part of the original common/ list in the design plan, but pulled
// out here since it's byte-for-byte identical across two screens —
// duplicating it inline would drift over time.

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Text from './Text';
import { colors, spacing } from '@/theme';

export default function AuthHeader() {
  const router = useRouter();

  return (
    <View style={styles.header}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={8}
        style={styles.iconButton}
        accessibilityLabel="Go back"
      >
        <MaterialCommunityIcons name="arrow-left" size={22} color={colors.primary} />
      </Pressable>

      <Text variant="displayMd" style={styles.wordmark}>
        OUTFIT AI
      </Text>

      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.stackSm,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: { width: 40 },
  wordmark: {
    fontSize: 17, // display-md scaled down to fit inline in a compact header bar
    letterSpacing: -0.2,
  },
});

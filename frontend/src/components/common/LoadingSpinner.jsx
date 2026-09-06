// src/components/common/LoadingSpinner.jsx
//
// Standard loading indicator. Use `fullScreen` for initial screen loads,
// or inline (default) for smaller loading contexts (e.g. inside a card).

import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import Text from './Text';
import { colors, spacing } from '@/theme';

export default function LoadingSpinner({ fullScreen = false, label, style }) {
  return (
    <View style={[fullScreen ? styles.fullScreen : styles.inline, style]}>
      <ActivityIndicator size="small" color={colors.primary} />
      {label && (
        <Text variant="bodyMd" color="secondary" style={styles.label}>
          {label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  inline: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.stackLg,
  },
  label: { marginTop: spacing.stackSm },
});

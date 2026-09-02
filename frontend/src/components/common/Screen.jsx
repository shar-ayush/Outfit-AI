// src/components/common/Screen.jsx
//
// Standard screen wrapper — SafeAreaView + optional ScrollView, consistent
// background and horizontal gutter. Every top-level screen should wrap its
// content in this rather than reimplementing SafeAreaView each time.
//
// Usage:
//   <Screen>...</Screen>                     — plain, no scroll
//   <Screen scroll>...</Screen>               — scrollable content
//   <Screen scroll padded={false}>...</Screen> — edge-to-edge (e.g. image-heavy screens)
//   <Screen edges={['top']}>...</Screen>      — only apply safe-area on top (e.g. screens with a tab bar)

import React from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme';

export default function Screen({
  children,
  scroll = false,
  padded = true,
  edges = ['top', 'bottom'],
  backgroundColor = colors.background,
  contentContainerStyle,
  style,
  refreshing,
  onRefresh,
  ...rest
}) {
  const content = (
    <View style={[padded && styles.padded, style]}>{children}</View>
  );

  return (
    <SafeAreaView
      edges={edges}
      style={[styles.flex, { backgroundColor }]}
      {...rest}
    >
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            padded && styles.paddedContent,
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={!!refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { flex: 1, paddingHorizontal: spacing.gutter },
  paddedContent: { paddingHorizontal: spacing.gutter, paddingBottom: spacing.stackXl },
});

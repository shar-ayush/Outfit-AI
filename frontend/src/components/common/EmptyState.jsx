import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Text from './Text';
import Button from './Button';
import { colors, spacing, radius } from '@/theme';

export default function EmptyState({
  icon = 'image-outline',
  title,
  description,
  actionLabel,
  onAction,
  style,
}) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        <MaterialCommunityIcons name={icon} size={36} color={colors.secondary} />
      </View>
      {title && (
        <Text variant="titleMd" style={styles.title}>
          {title}
        </Text>
      )}
      {description && (
        <Text variant="bodyMd" color="secondary" style={styles.description}>
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button onPress={onAction} fullWidth={false} style={styles.button}>
          {actionLabel}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.stackXl,
    paddingHorizontal: spacing.stackLg,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.stackMd,
  },
  title: { textAlign: 'center', marginBottom: spacing.stackSm },
  description: { textAlign: 'center', marginBottom: spacing.stackLg, maxWidth: 280 },
  button: { paddingHorizontal: spacing.stackLg },
});

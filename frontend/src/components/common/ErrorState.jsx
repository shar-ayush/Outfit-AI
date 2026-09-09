import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Text from './Text';
import Button from './Button';
import { colors, spacing, radius } from '@/theme';

export default function ErrorState({
  title = 'Something went wrong',
  description = "We couldn't load this right now. Check your connection and try again.",
  onRetry,
  style,
}) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        <MaterialCommunityIcons name="alert-circle-outline" size={32} color={colors.error} />
      </View>
      <Text variant="titleMd" style={styles.title}>
        {title}
      </Text>
      <Text variant="bodyMd" color="secondary" style={styles.description}>
        {description}
      </Text>
      {onRetry && (
        <Button variant="secondary" onPress={onRetry} fullWidth={false} style={styles.button}>
          Try Again
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
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: '#FBE4E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.stackMd,
  },
  title: { textAlign: 'center', marginBottom: spacing.stackSm },
  description: { textAlign: 'center', marginBottom: spacing.stackLg, maxWidth: 280 },
  button: { paddingHorizontal: spacing.stackLg },
});

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Text from './Text';
import { colors, spacing } from '@/theme';

export default function AuthHeader() {
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(auth)/welcome');
    }
  };

  return (
    <View style={styles.header}>
      <Pressable
        onPress={handleBack}
        hitSlop={8}
        style={styles.iconButton}
        accessibilityLabel="Go back"
      >
        <MaterialCommunityIcons name="arrow-left" size={22} color={colors.primary} />
      </Pressable>

      <Text variant="titleMd" style={styles.wordmark}>
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
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    letterSpacing: 1.2,
  },
});

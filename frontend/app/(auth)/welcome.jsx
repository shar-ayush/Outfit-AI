// app/(auth)/welcome.jsx
//
// Minimal, editorial welcome screen matching Haute Systems design language.
// Clean typography, understated prestige badge, and clear calls to action.

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Text from '@/components/common/Text';
import Button from '@/components/common/Button';
import { colors, spacing, radius } from '@/theme';

const HIGHLIGHTS = [
  { icon: 'creation', label: 'AI Virtual Try-On' },
  { icon: 'hanger', label: 'Smart Wardrobe' },
  { icon: 'auto-fix', label: 'Personal Stylist' },
];

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.content}>
        {/* Top spacer */}
        <View style={styles.topSpacer} />

        {/* Center Editorial Brand Section */}
        <View style={styles.brandSection}>
          <View style={styles.iconEmblem}>
            <MaterialCommunityIcons name="hanger" size={32} color={colors.primary} />
            <View style={styles.goldDot} />
          </View>

          <Text variant="displayLg" style={styles.wordmark}>
            OUTFIT AI
          </Text>

          <Text variant="bodyLg" color="secondary" style={styles.tagline}>
            Your wardrobe, curated and styled with intelligence.
          </Text>

          {/* Minimal Feature Highlights */}
          <View style={styles.highlightsWrap}>
            {HIGHLIGHTS.map((item) => (
              <View key={item.label} style={styles.highlightPill}>
                <MaterialCommunityIcons
                  name={item.icon}
                  size={14}
                  color={colors.goldAccent}
                />
                <Text variant="labelCaps" color="secondary" style={styles.highlightText}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomSection}>
          <View style={styles.actions}>
            <Button onPress={() => router.push('/(auth)/register')} size="lg">
              Get Started
            </Button>
            <Button
              variant="secondary"
              onPress={() => router.push('/(auth)/login')}
              style={styles.loginButton}
              size="lg"
            >
              Log In
            </Button>
          </View>

          <Text variant="caption" color="secondary" style={styles.disclaimer}>
            By continuing, you agree to our Terms & Privacy Policy.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter,
    paddingBottom: spacing.stackLg,
  },
  topSpacer: {
    height: 32,
  },
  brandSection: {
    alignItems: 'center',
    paddingHorizontal: spacing.stackSm,
  },
  iconEmblem: {
    width: 68,
    height: 68,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.stackLg,
  },
  goldDot: {
    position: 'absolute',
    top: 14,
    right: 18,
    width: 7,
    height: 7,
    borderRadius: radius.circle,
    backgroundColor: colors.goldAccent,
  },
  wordmark: {
    letterSpacing: 3,
    textAlign: 'center',
    fontFamily: 'Inter_700Bold',
    color: colors.onSurface,
  },
  tagline: {
    marginTop: spacing.stackSm,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
  },
  highlightsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.stackXl,
  },
  highlightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
  },
  highlightText: {
    letterSpacing: 0.5,
    fontSize: 10,
  },
  bottomSection: {
    width: '100%',
    alignItems: 'center',
  },
  actions: {
    width: '100%',
  },
  loginButton: {
    marginTop: spacing.stackMd,
  },
  disclaimer: {
    marginTop: spacing.stackLg,
    textAlign: 'center',
    fontSize: 11,
  },
});

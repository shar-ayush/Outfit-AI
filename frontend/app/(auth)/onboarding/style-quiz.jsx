// app/(auth)/onboarding/style-quiz.jsx
//
// Matches style_quiz_step_1/code.html: 2-column grid of full-bleed image
// cards, gold border + checkmark badge when selected, pinned Continue CTA.

import React from 'react';
import { View, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text from '@/components/common/Text';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import OnboardingHeader from '@/components/common/OnboardingHeader';
import { useOnboardingStore } from '@/stores';
import { STYLE_OPTIONS } from '@/constants/categories';
import { colors, spacing, radius } from '@/theme';

export default function StyleQuizScreen() {
  const router = useRouter();
  const preferredStyles = useOnboardingStore((s) => s.preferredStyles);
  const toggleStyle = useOnboardingStore((s) => s.toggleStyle);

  const canContinue = preferredStyles.length > 0;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <OnboardingHeader step={1} totalSteps={4} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heading}>
          <Text variant="labelCaps" color="secondary">
            Step 1 of 4
          </Text>
          <Text variant="displayLg" style={styles.title}>
            What's your style?
          </Text>
          <Text variant="bodyLg" color="secondary" style={styles.subtitle}>
            Select styles you'd like to explore.
          </Text>
        </View>

        <View style={styles.grid}>
          {STYLE_OPTIONS.map((option) => {
            const selected = preferredStyles.includes(option.value);
            return (
              <Pressable
                key={option.value}
                onPress={() => toggleStyle(option.value)}
                style={[styles.card, selected && styles.cardSelected]}
              >
                <Image source={{ uri: option.image }} style={StyleSheet.absoluteFill} contentFit="cover" />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.6)']}
                  locations={[0, 0.4, 1]}
                  style={StyleSheet.absoluteFill}
                />
                {selected && (
                  <View style={styles.checkBadge}>
                    <Badge type="check" />
                  </View>
                )}
                <Text variant="titleMd" color="onPrimary" style={styles.cardLabel}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          onPress={() => router.push('/(auth)/onboarding/color-quiz')}
          disabled={!canContinue}
          icon="arrow-right"
          iconPosition="right"
        >
          Continue
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: spacing.gutter, paddingBottom: spacing.stackXl },
  heading: { marginTop: spacing.stackMd, marginBottom: spacing.stackLg },
  title: { marginTop: spacing.stackSm },
  subtitle: { marginTop: spacing.stackSm },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    aspectRatio: 3 / 4,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.stackMd,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    justifyContent: 'flex-end',
    padding: 12,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: colors.goldAccent,
  },
  checkBadge: { position: 'absolute', top: 10, right: 10 },
  cardLabel: { textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 4 },
  footer: {
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.stackMd,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerHigh,
    backgroundColor: colors.surface,
  },
});

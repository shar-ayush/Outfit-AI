// app/(auth)/onboarding/complete.jsx
//
// Matches profile_ready_step_4/code.html: celebratory check icon, heading,
// an "AI Interpretation" summary card, sticky "Enter the App" CTA.
//
// Unlike the static mock (which hardcodes "Neutral"/"Tailored" placeholder
// chips), this screen builds the summary from the user's ACTUAL selections
// collected across the previous 3 steps — submits them to
// POST /api/user/onboarding on mount... actually on button press, not
// mount, so a failed submit doesn't strand the user mid-animation.

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Text from '@/components/common/Text';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import { userApi } from '@/api';
import { useAuthStore, useOnboardingStore, useUIStore } from '@/stores';
import { STYLE_OPTIONS, COLOR_OPTIONS, CLIMATE_OPTIONS, FORMALITY_OPTIONS } from '@/constants/categories';
import { colors, spacing, radius, shadows } from '@/theme';

function labelsFor(options, values) {
  return values
    .map((v) => options.find((o) => o.value === v)?.label)
    .filter(Boolean);
}

export default function OnboardingCompleteScreen() {
  const router = useRouter();
  const showToast = useUIStore((s) => s.showToast);
  const updateUser = useAuthStore((s) => s.updateUser);
  const { preferredStyles, preferredColors, climate, preferredFormality, reset } =
    useOnboardingStore();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const styleLabels = labelsFor(STYLE_OPTIONS, preferredStyles);
  const colorLabels = labelsFor(COLOR_OPTIONS, preferredColors);
  const climateLabel = CLIMATE_OPTIONS.find((o) => o.value === climate)?.label || '—';
  const formalityLabel = labelsFor(FORMALITY_OPTIONS, preferredFormality)[0] || '—';

  const handleEnterApp = async () => {
    setIsSubmitting(true);
    try {
      const user = await userApi.completeOnboarding({
        preferredStyles,
        preferredColors,
        preferredFormality,
        climate,
      });
      updateUser({ ...user, onboardingCompleted: true });
      reset();
      router.replace('/(app)/home');
    } catch (error) {
      const message = error?.response?.data?.message || 'Could not save your style profile';
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.progressBar}>
        <View style={styles.progressRow}>
          <Text variant="labelCaps" color="secondary">STEP 4 OF 4</Text>
          <Text variant="labelCaps" color="secondary">COMPLETE</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <View style={styles.iconGlow} />
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="check-circle" size={44} color={colors.goldAccent} />
          </View>
        </View>

        <Text variant="displayLg" style={styles.title}>
          Your style profile is ready.
        </Text>
        <Text variant="bodyLg" color="secondary" style={styles.subtitle}>
          We've curated your initial wardrobe matrix. Here is a summary of your preferences.
        </Text>

        <Card elevated style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <MaterialCommunityIcons name="creation" size={18} color={colors.primary} />
            <Text variant="titleMd" style={styles.summaryHeaderText}>
              AI Interpretation
            </Text>
          </View>

          <View style={styles.chipsRow}>
            <SummaryChip label="AESTHETIC" value={styleLabels.join(', ') || '—'} />
            <SummaryChip label="COLORS" value={colorLabels.slice(0, 2).join(', ') || '—'} />
            <SummaryChip label="CLIMATE" value={climateLabel} />
            <SummaryChip label="FORMALITY" value={formalityLabel} />
          </View>
        </Card>
      </View>

      <View style={styles.footer}>
        <Button onPress={handleEnterApp} loading={isSubmitting} icon="arrow-right" iconPosition="right">
          Enter the App
        </Button>
      </View>
    </SafeAreaView>
  );
}

function SummaryChip({ label, value }) {
  return (
    <View style={styles.chip}>
      <Text variant="labelCaps" color="secondary">
        {label}:
      </Text>
      <Text variant="bodyMd" style={styles.chipValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  progressBar: { paddingHorizontal: spacing.gutter, paddingTop: spacing.stackMd },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.stackSm },
  progressTrack: { height: 2, backgroundColor: colors.surfaceContainerHigh },
  progressFill: { height: '100%', width: '100%', backgroundColor: colors.primary },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.containerPadding,
  },
  iconWrap: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.stackMd },
  iconGlow: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.goldAccentLight,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  title: { textAlign: 'center', marginBottom: spacing.stackSm },
  subtitle: { textAlign: 'center', maxWidth: 280, marginBottom: spacing.stackLg },
  summaryCard: { width: '100%' },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.stackMd },
  summaryHeaderText: { marginLeft: spacing.stackSm },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.stackSm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.full,
    paddingHorizontal: spacing.stackMd,
    paddingVertical: 6,
    gap: 6,
  },
  chipValue: { fontFamily: 'Inter_600SemiBold' },
  footer: {
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.stackMd,
    backgroundColor: colors.surface,
  },
});

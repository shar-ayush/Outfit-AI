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
import { View, ScrollView, StyleSheet } from 'react-native';
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
            <MaterialCommunityIcons name="creation" size={18} color={colors.goldAccent} />
            <Text variant="titleMd" style={styles.summaryHeaderText}>
              Your preferences
            </Text>
          </View>

          <View style={styles.summaryBody}>
            {/* Aesthetic */}
            <View style={styles.prefSection}>
              <Text variant="labelCaps" color="secondary" style={styles.prefLabel}>
                Aesthetic
              </Text>
              <View style={styles.tagsRow}>
                {styleLabels.length > 0 ? (
                  styleLabels.map((style) => (
                    <View key={style} style={styles.tagBadge}>
                      <Text variant="bodySm" style={styles.tagText}>{style}</Text>
                    </View>
                  ))
                ) : (
                  <Text variant="bodyMd" color="secondary">—</Text>
                )}
              </View>
            </View>

            {/* Colors */}
            <View style={styles.prefSection}>
              <Text variant="labelCaps" color="secondary" style={styles.prefLabel}>
                Palette
              </Text>
              <View style={styles.tagsRow}>
                {preferredColors.length > 0 ? (
                  preferredColors.map((colorVal) => {
                    const colorOpt = COLOR_OPTIONS.find((c) => c.value === colorVal);
                    const label = colorOpt?.label || colorVal;
                    const hex = colorOpt?.hex;
                    return (
                      <View key={colorVal} style={styles.colorTagBadge}>
                        {hex && (
                          <View
                            style={[
                              styles.colorDot,
                              { backgroundColor: hex },
                              (colorVal === 'white' || colorVal === 'cream') && styles.lightColorDotBorder,
                            ]}
                          />
                        )}
                        <Text variant="bodySm" style={styles.tagText}>{label}</Text>
                      </View>
                    );
                  })
                ) : (
                  <Text variant="bodyMd" color="secondary">—</Text>
                )}
              </View>
            </View>

            {/* Climate & Formality */}
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Text variant="labelCaps" color="secondary" style={styles.prefLabel}>
                  Climate
                </Text>
                <View style={styles.tagBadge}>
                  <Text variant="bodySm" style={styles.tagText}>{climateLabel}</Text>
                </View>
              </View>

              <View style={styles.metaItem}>
                <Text variant="labelCaps" color="secondary" style={styles.prefLabel}>
                  Formality
                </Text>
                <View style={styles.tagBadge}>
                  <Text variant="bodySm" style={styles.tagText}>{formalityLabel}</Text>
                </View>
              </View>
            </View>
          </View>
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <Button onPress={handleEnterApp} loading={isSubmitting} icon="arrow-right" iconPosition="right">
          Enter the App
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  progressBar: { paddingHorizontal: spacing.gutter, paddingTop: spacing.stackMd },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.stackSm },
  progressTrack: { height: 2, backgroundColor: colors.surfaceContainerHigh },
  progressFill: { height: '100%', width: '100%', backgroundColor: colors.primary },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: spacing.containerPadding,
    paddingTop: spacing.stackMd,
    paddingBottom: spacing.stackLg,
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
  summaryCard: { width: '100%', padding: spacing.stackLg },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.stackMd,
    paddingBottom: spacing.stackSm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHigh,
  },
  summaryHeaderText: { marginLeft: spacing.stackSm, fontFamily: 'Inter_600SemiBold' },
  summaryBody: { gap: spacing.stackMd },
  prefSection: { gap: 6 },
  prefLabel: { marginBottom: 2, letterSpacing: 0.8 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.stackSm },
  tagBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.full,
    paddingHorizontal: spacing.stackMd,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
  },
  colorTagBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.full,
    paddingHorizontal: spacing.stackMd,
    paddingVertical: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
  },
  tagText: {
    fontFamily: 'Inter_500Medium',
    color: colors.onSurface,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  lightColorDotBorder: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.stackMd,
    marginTop: 2,
  },
  metaItem: {
    flex: 1,
    gap: 6,
  },
  footer: {
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.stackMd,
    backgroundColor: colors.surface,
  },
});

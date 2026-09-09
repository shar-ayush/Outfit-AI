import React from 'react';
import { View, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text from '@/components/common/Text';
import Button from '@/components/common/Button';
import Divider from '@/components/common/Divider';
import OnboardingHeader from '@/components/common/OnboardingHeader';
import { useOnboardingStore } from '@/stores';
import { CLIMATE_OPTIONS, FORMALITY_OPTIONS } from '@/constants/categories';
import { colors, spacing, radius } from '@/theme';

export default function ClimateQuizScreen() {
  const router = useRouter();
  const climate = useOnboardingStore((s) => s.climate);
  const setClimate = useOnboardingStore((s) => s.setClimate);
  const preferredFormality = useOnboardingStore((s) => s.preferredFormality);
  const setFormality = useOnboardingStore((s) => s.setFormality);

  const selectedFormality = preferredFormality[0] || null;
  const canContinue = !!climate && !!selectedFormality;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <OnboardingHeader step={3} totalSteps={4} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text variant="labelCaps" color="secondary">
          Step 3 of 4
        </Text>

        <Text variant="headlineSm" style={styles.sectionTitle}>
          What's your climate?
        </Text>
        <Text variant="bodyLg" color="secondary" style={styles.sectionSubtitle}>
          This helps us recommend appropriate fabrics and layers.
        </Text>

        <View style={styles.climateGrid}>
          {CLIMATE_OPTIONS.map((option) => {
            const selected = climate === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setClimate(option.value)}
                style={[styles.climatePill, selected && styles.climatePillSelected]}
              >
                <MaterialCommunityIcons
                  name={option.icon}
                  size={32}
                  color={selected ? colors.onPrimary : colors.primary}
                />
                <Text variant="titleMd" color={selected ? 'onPrimary' : 'onSurface'} style={styles.climateLabel}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Divider style={styles.divider} />

        <Text variant="headlineSm" style={styles.sectionTitle}>
          How formal is your day-to-day?
        </Text>
        <Text variant="bodyLg" color="secondary" style={styles.sectionSubtitle}>
          Select the look that best matches your usual environment.
        </Text>

        <View style={styles.formalityRow}>
          {FORMALITY_OPTIONS.map((option) => {
            const selected = selectedFormality === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setFormality(option.value)}
                style={[styles.formalityCard, selected && styles.formalityCardSelected]}
              >
                <Image source={{ uri: option.image }} style={styles.formalityImage} contentFit="cover" />
                <View style={styles.formalityLabelWrap}>
                  <Text variant="titleMd" style={styles.formalityLabel}>
                    {option.label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          onPress={() => router.push('/(auth)/onboarding/complete')}
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
  scrollContent: { paddingHorizontal: spacing.gutter, paddingTop: spacing.stackMd, paddingBottom: spacing.stackXl },
  sectionTitle: { marginTop: spacing.stackSm },
  sectionSubtitle: { marginTop: spacing.stackSm, marginBottom: spacing.stackMd },
  climateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  climatePill: {
    width: '48%',
    aspectRatio: 1.4,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.stackMd,
  },
  climatePillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  climateLabel: { marginTop: spacing.stackSm },
  divider: { marginVertical: spacing.stackLg },
  formalityRow: { flexDirection: 'row', gap: spacing.stackSm },
  formalityCard: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  formalityCardSelected: {
    borderWidth: 2,
    borderColor: colors.goldAccent,
  },
  formalityImage: { width: '100%', aspectRatio: 4 / 5 },
  formalityLabelWrap: {
    padding: spacing.stackSm,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerHigh,
  },
  formalityLabel: { textAlign: 'center', fontSize: 13 },
});

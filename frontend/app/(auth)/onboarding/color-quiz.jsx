import React from 'react';
import { View, Pressable, ScrollView, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text from '@/components/common/Text';
import Button from '@/components/common/Button';
import OnboardingHeader from '@/components/common/OnboardingHeader';
import { useOnboardingStore } from '@/stores';
import { COLOR_OPTIONS } from '@/constants/categories';
import { colors, spacing } from '@/theme';

const LIGHT_SWATCHES = new Set(['beige', 'cream']);

export default function ColorQuizScreen() {
  const router = useRouter();
  const preferredColors = useOnboardingStore((s) => s.preferredColors);
  const toggleColor = useOnboardingStore((s) => s.toggleColor);

  const canContinue = preferredColors.length > 0;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <OnboardingHeader step={2} totalSteps={4} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heading}>
          <Text variant="labelCaps" color="secondary">
            Step 2 of 4
          </Text>
          <Text variant="displayLg" style={styles.title}>
            Pick your go-to colors.
          </Text>
          <Text variant="bodyLg" color="secondary" style={styles.subtitle}>
            Choose at least 1 shade that grounds your wardrobe.
          </Text>
        </View>

        <View style={styles.grid}>
          {COLOR_OPTIONS.map((option) => {
            const selected = preferredColors.includes(option.value);
            const darkCheck = LIGHT_SWATCHES.has(option.value);
            return (
              <Pressable
                key={option.value}
                onPress={() => toggleColor(option.value)}
                style={styles.swatchWrapper}
              >
                <View
                  style={[
                    styles.swatch,
                    { backgroundColor: option.hex },
                    selected && styles.swatchSelected,
                  ]}
                >
                  {selected && (
                    <MaterialCommunityIcons
                      name="check-bold"
                      size={22}
                      color={darkCheck ? colors.primary : colors.onPrimary}
                    />
                  )}
                </View>
                <Text
                  variant="bodyMd"
                  color={selected ? 'onSurface' : 'secondary'}
                  style={selected && styles.swatchLabelSelected}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          onPress={() => router.push('/(auth)/onboarding/climate-quiz')}
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
    rowGap: spacing.stackLg,
  },
  swatchWrapper: { width: '25%', alignItems: 'center' },
  swatch: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.stackSm,
  },
  swatchSelected: {
    borderWidth: 3,
    borderColor: colors.goldAccent,
    transform: [{ scale: 1.05 }],
  },
  swatchLabelSelected: { fontFamily: 'Inter_600SemiBold' },
  footer: {
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.stackMd,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerHigh,
    backgroundColor: colors.surface,
  },
});

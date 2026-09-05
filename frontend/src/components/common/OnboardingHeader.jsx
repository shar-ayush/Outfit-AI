// src/components/common/OnboardingHeader.jsx
//
// Unified header used across all 4 onboarding steps. The three Stitch
// mockups have small header inconsistencies (style_quiz/color_quiz show
// "outfiT AI" centered; climate_formality shows "Step 3 of 4" text
// instead) — reconciled here into one consistent chrome: back button,
// wordmark, spacer, then a progress bar showing step/totalSteps. The
// "Step X of 4" caption still appears in each screen's own content below,
// exactly as int he mocks.

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Text from './Text';
import ProgressBar from './ProgressBar';
import { colors, spacing } from '@/theme';

export default function OnboardingHeader({ step, totalSteps = 4 }) {
  const router = useRouter();

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={styles.iconButton}
          accessibilityLabel="Go back"
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.primary} />
        </Pressable>

        <Text variant="displayMd" style={styles.wordmark}>
          outfiT AI
        </Text>

        <View style={styles.spacer} />
      </View>

      <View style={styles.progressWrap}>
        <ProgressBar progress={step / totalSteps} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { backgroundColor: colors.surface },
  row: {
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
  wordmark: { fontSize: 17, letterSpacing: -0.2 },
  progressWrap: { paddingHorizontal: spacing.gutter, paddingBottom: spacing.stackSm },
});

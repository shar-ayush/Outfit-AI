// app/(modals)/log-wear.jsx
//
// Backed by POST /api/wear-logs (wearLogController.logWear), which accepts
// { outfitId, occasion, rating, feedback, temperature, condition,
// recommendationId? }. Reached from Home's "Worn Today" button with
// outfitId + recommendationId already in hand (see home/index.jsx).
//
// Temperature/condition are auto-filled from the real device weather
// (useWeather) rather than asking the user to type them in manually -
// consistent with how the rest of the app already treats weather as
// ambient context, not a form field.

import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Screen from '@/components/common/Screen';
import Text from '@/components/common/Text';
import Button from '@/components/common/Button';
import { useLogWear } from '@/hooks/useWearLogs';
import { useWeather } from '@/hooks/useWeather';
import { useUIStore } from '@/stores';
import { OCCASIONS } from '@/constants/categories';
import { colors, spacing, radius } from '@/theme';

function StarRating({ rating, onChange }) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} hitSlop={4}>
          <MaterialCommunityIcons
            name={n <= rating ? 'star' : 'star-outline'}
            size={32}
            color={colors.goldAccent}
          />
        </Pressable>
      ))}
    </View>
  );
}

export default function LogWearModal() {
  const { outfitId, recommendationId } = useLocalSearchParams();
  const router = useRouter();
  const showToast = useUIStore((s) => s.showToast);
  const { data: weather } = useWeather();
  const logWear = useLogWear();

  const [occasion, setOccasion] = useState(null);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  const handleSubmit = () => {
    logWear.mutate(
      {
        outfitId,
        occasion: occasion || undefined,
        rating: rating || undefined,
        feedback: feedback || undefined,
        temperature: weather?.temperature,
        condition: weather?.condition,
        recommendationId: recommendationId || undefined,
      },
      {
        onSuccess: () => {
          showToast('Wear logged — thanks!', 'success');
          router.back();
        },
        onError: () => showToast('Could not log this wear', 'error'),
      }
    );
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Close">
          <MaterialCommunityIcons name="close" size={24} color={colors.primary} />
        </Pressable>
        <Text variant="titleMd">Log Wear</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text variant="headlineSm" style={styles.title}>How was today's fit?</Text>

      <Text variant="labelCaps" color="secondary" style={styles.fieldLabel}>Occasion</Text>
      <View style={styles.chipRow}>
        {OCCASIONS.slice(0, 6).map((occ) => (
          <Pressable
            key={occ}
            style={[styles.chip, occasion === occ && styles.chipActive]}
            onPress={() => setOccasion(occ)}
          >
            <Text variant="bodyMd" color={occasion === occ ? 'onPrimary' : 'onSurface'}>
              {occ}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text variant="labelCaps" color="secondary" style={styles.fieldLabel}>Rating (optional)</Text>
      <StarRating rating={rating} onChange={setRating} />

      <Text variant="labelCaps" color="secondary" style={styles.fieldLabel}>Notes (optional)</Text>
      <View style={styles.feedbackChips}>
        {['Felt great', 'Too warm', 'Too formal', 'Loved it'].map((preset) => (
          <Pressable
            key={preset}
            style={[styles.presetChip, feedback === preset && styles.chipActive]}
            onPress={() => setFeedback(preset)}
          >
            <Text variant="bodyMd" color={feedback === preset ? 'onPrimary' : 'onSurface'}>
              {preset}
            </Text>
          </Pressable>
        ))}
      </View>

      {weather && (
        <Text variant="caption" color="secondary" style={styles.weatherNote}>
          Logged with today's weather: {weather.temperature}°C, {weather.condition}
        </Text>
      )}

      <Button onPress={handleSubmit} loading={logWear.isPending} style={styles.submitButton}>
        Log Wear
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.stackSm,
    marginBottom: spacing.stackLg,
  },
  title: { marginBottom: spacing.stackLg },
  fieldLabel: { marginBottom: spacing.stackSm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.stackLg, gap: spacing.stackSm },
  chip: {
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.full,
    paddingHorizontal: spacing.stackMd,
    paddingVertical: 8,
    textTransform: 'capitalize',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  starsRow: { flexDirection: 'row', gap: spacing.stackSm, marginBottom: spacing.stackLg },
  feedbackChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.stackSm, marginBottom: spacing.stackMd },
  presetChip: {
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.full,
    paddingHorizontal: spacing.stackMd,
    paddingVertical: 8,
  },
  weatherNote: { marginBottom: spacing.stackLg },
  submitButton: { marginTop: spacing.stackMd },
});
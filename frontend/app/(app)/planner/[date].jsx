import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { format } from 'date-fns';
import { parseLocalDate } from '@/utils/dateUtils';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Screen from '@/components/common/Screen';
import Text from '@/components/common/Text';
import Button from '@/components/common/Button';
import Tag from '@/components/common/Tag';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import BottomSheet from '@/components/common/BottomSheet';
import { PlanStatusBadge, OutfitPicker } from '@/components/planner';
import OutfitItemsRow from '@/components/outfit/OutfitItemsRow';
import { useDayPlan, useCreatePlan, useUpdatePlanStatus } from '@/hooks/usePlans';
import { useSuggestOutfits } from '@/hooks/useOutfits';
import { useWeather } from '@/hooks/useWeather';
import { useUIStore } from '@/stores';
import { colors, spacing, radius } from '@/theme';

const OCCASION_CHIPS = [
  { label: 'Work', value: 'office', icon: 'briefcase-outline' },
  { label: 'Casual', value: 'casual', icon: 'coffee-outline' },
  { label: 'Formal', value: 'formal', icon: 'tie' },
  { label: 'Party', value: 'party', icon: 'party-popper' },
  { label: 'Date', value: 'date', icon: 'heart-outline' },
  { label: 'Travel', value: 'travel', icon: 'airplane' },
];

export default function DayDetailScreen() {
  const { date } = useLocalSearchParams();
  const router = useRouter();
  const showToast = useUIStore((s) => s.showToast);

  const { data: plan, isLoading, refetch } = useDayPlan(date);
  const { data: weather } = useWeather();
  const suggestOutfits = useSuggestOutfits();
  const createPlan = useCreatePlan();
  const updateStatus = useUpdatePlanStatus();

  const [mode, setMode] = useState('view');
  const [occasion, setOccasion] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const dateObj = parseLocalDate(date);
  const dateLabel = format(dateObj, 'EEEE, MMM d');

  const handleGenerate = () => {
    if (!occasion) return;
    const occasionLabel = OCCASION_CHIPS.find((o) => o.value === occasion)?.label || occasion;
    const query = weather
      ? `An outfit for ${occasionLabel} on ${dateLabel}, ${weather.temperature}°C, ${weather.condition.toLowerCase()}`
      : `An outfit for ${occasionLabel} on ${dateLabel}`;

    suggestOutfits.mutate(
      {
        query,
        count: 3,
        weatherContext: weather ? { temperature: weather.temperature, condition: weather.condition } : null,
      },
      {
        onSuccess: (result) => {
          if (!result.outfits || result.outfits.length === 0) {
            showToast(result.message || 'Could not generate outfits for this day', 'error');
            return;
          }
          setCandidates(result.outfits);
          setMode('results');
        },
        onError: () => showToast('Could not generate outfits right now', 'error'),
      }
    );
  };

  const handlePickCandidate = (outfit) => {
    createPlan.mutate(
      { outfitId: outfit.outfitId, date, occasion, recommendationId: outfit.recommendationId },
      {
        onSuccess: () => {
          showToast('Day planned', 'success');
          setMode('view');
          refetch();
        },
        onError: () => showToast('Could not save this plan', 'error'),
      }
    );
  };

  const handlePickSaved = (outfit) => {
    createPlan.mutate(
      { outfitId: outfit._id, date, occasion: outfit.occasion },
      {
        onSuccess: () => {
          setPickerOpen(false);
          showToast('Day planned', 'success');
          refetch();
        },
        onError: () => showToast('Could not save this plan', 'error'),
      }
    );
  };

  const handleMarkWorn = () => {
    updateStatus.mutate(
      { planId: plan._id, status: 'worn' },
      {
        onSuccess: () => showToast('Marked as worn', 'success'),
        onError: () => showToast('Could not update this plan', 'error'),
      }
    );
  };

  const handleSkip = () => {
    updateStatus.mutate(
      { planId: plan._id, status: 'skipped' },
      {
        onSuccess: () => showToast('Skipped', 'success'),
        onError: () => showToast('Could not update this plan', 'error'),
      }
    );
  };

  if (isLoading) return <LoadingSpinner fullScreen />;

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialCommunityIcons name="close" size={24} color={colors.primary} />
        </Pressable>
        <Text variant="titleMd">{dateLabel}</Text>
        <View style={{ width: 24 }} />
      </View>

      {plan && mode === 'view' && (
        <View>
          <View style={styles.planHeaderRow}>
            {plan.occasion && <Tag label={plan.occasion} variant="static" />}
            <PlanStatusBadge status={plan.status} />
          </View>

          <Text variant="displayMd" style={styles.outfitName}>
            {plan.outfitId?.outfitName || 'Planned outfit'}
          </Text>
          {plan.outfitId?.whyItWorks && (
            <Text variant="bodyLg" color="secondary" style={styles.whyItWorks}>
              {plan.outfitId.whyItWorks}
            </Text>
          )}

          <Pressable
            style={styles.previewWrap}
            onPress={() =>
              plan.outfitId?._id &&
              router.push({ pathname: '/(modals)/outfit-detail', params: { outfitId: plan.outfitId._id } })
            }
          >
            <OutfitItemsRow items={plan.outfitId?.items || []} size={72} />
            <Text variant="bodyMd" color="secondary" style={styles.viewDetailLabel}>
              View full details
            </Text>
          </Pressable>

          {plan.status === 'planned' && (
            <View style={styles.actionsRow}>
              <Button onPress={handleMarkWorn} loading={updateStatus.isPending} style={styles.actionFlex}>
                Mark as Worn
              </Button>
              <Button variant="secondary" onPress={handleSkip} style={styles.actionFlex}>
                Skip
              </Button>
            </View>
          )}

          <Button variant="ghost" onPress={() => setMode('changeOptions')} style={styles.changeButton}>
            Change Outfit
          </Button>
        </View>
      )}

      {plan && mode === 'changeOptions' && (
        <View>
          <Text variant="headlineSm" style={styles.emptyTitle}>Change outfit</Text>
          <Text variant="bodyLg" color="secondary" style={styles.emptySubtitle}>
            How would you like to update this look?
          </Text>

          <Pressable style={styles.optionCard} onPress={() => setMode('chooseOccasion')}>
            <MaterialCommunityIcons name="creation" size={22} color={colors.goldAccent} />
            <View style={styles.optionText}>
              <Text variant="titleMd">Generate outfit for this day</Text>
              <Text variant="bodyMd" color="secondary">
                Let AI curate a look based on the weather and your style.
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.secondary} />
          </Pressable>

          <Pressable style={styles.optionCard} onPress={() => setPickerOpen(true)}>
            <MaterialCommunityIcons name="bookmark-outline" size={22} color={colors.primary} />
            <View style={styles.optionText}>
              <Text variant="titleMd">Pick from saved outfits</Text>
              <Text variant="bodyMd" color="secondary">
                Choose from your saved collection.
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.secondary} />
          </Pressable>

          <Pressable
            style={styles.optionCard}
            onPress={() => router.push({ pathname: '/planner/design', params: { date } })}
          >
            <MaterialCommunityIcons name="hanger" size={22} color={colors.primary} />
            <View style={styles.optionText}>
              <Text variant="titleMd">Design from wardrobe</Text>
              <Text variant="bodyMd" color="secondary">
                Handpick items from your closet to build a custom look.
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.secondary} />
          </Pressable>

          <Button variant="ghost" onPress={() => setMode('view')} style={styles.changeButton}>
            Cancel
          </Button>
        </View>
      )}

      {!plan && mode === 'view' && (
        <View>
          <Text variant="headlineSm" style={styles.emptyTitle}>Start your plan</Text>
          <Text variant="bodyLg" color="secondary" style={styles.emptySubtitle}>
            How would you like to build this look?
          </Text>

          <Pressable style={styles.optionCard} onPress={() => setMode('chooseOccasion')}>
            <MaterialCommunityIcons name="creation" size={22} color={colors.goldAccent} />
            <View style={styles.optionText}>
              <Text variant="titleMd">Generate outfit for this day</Text>
              <Text variant="bodyMd" color="secondary">
                Let AI curate a look based on the weather and your style.
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.secondary} />
          </Pressable>

          <Pressable style={styles.optionCard} onPress={() => setPickerOpen(true)}>
            <MaterialCommunityIcons name="bookmark-outline" size={22} color={colors.primary} />
            <View style={styles.optionText}>
              <Text variant="titleMd">Pick from saved outfits</Text>
              <Text variant="bodyMd" color="secondary">
                Choose from your saved collection.
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.secondary} />
          </Pressable>

          <Pressable
            style={styles.optionCard}
            onPress={() => router.push({ pathname: '/planner/design', params: { date } })}
          >
            <MaterialCommunityIcons name="hanger" size={22} color={colors.primary} />
            <View style={styles.optionText}>
              <Text variant="titleMd">Design from wardrobe</Text>
              <Text variant="bodyMd" color="secondary">
                Handpick items from your closet to build a custom look.
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.secondary} />
          </Pressable>
        </View>
      )}

      {mode === 'chooseOccasion' && (
        <View>
          <Text variant="headlineSm" style={styles.emptyTitle}>What's the occasion?</Text>
          {weather && (
            <Text variant="bodyMd" color="secondary" style={styles.weatherLine}>
              Weather forecast: {weather.temperature}°C, {weather.condition}
            </Text>
          )}

          <View style={styles.occasionGrid}>
            {OCCASION_CHIPS.map((chip) => (
              <Pressable
                key={chip.value}
                style={[styles.occasionChip, occasion === chip.value && styles.occasionChipActive]}
                onPress={() => setOccasion(chip.value)}
              >
                <MaterialCommunityIcons
                  name={chip.icon}
                  size={20}
                  color={occasion === chip.value ? colors.onPrimary : colors.onSurface}
                />
                <Text
                  variant="bodyMd"
                  color={occasion === chip.value ? 'onPrimary' : 'onSurface'}
                  style={styles.occasionLabel}
                >
                  {chip.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Button
            icon="creation"
            onPress={handleGenerate}
            disabled={!occasion}
            loading={suggestOutfits.isPending}
            style={styles.generateButton}
          >
            Generate Suggestions
          </Button>
        </View>
      )}

      {mode === 'results' && (
        <View>
          <Text variant="headlineSm" style={styles.emptyTitle}>Pick your look</Text>
          {candidates.map((outfit) => (
            <Pressable
              key={outfit.outfitId}
              style={styles.candidateCard}
              onPress={() => handlePickCandidate(outfit)}
            >
              <OutfitItemsRow items={outfit.items || []} size={56} />
              <View style={styles.candidateInfo}>
                <Text variant="titleMd" numberOfLines={1}>{outfit.outfitName}</Text>
                {outfit.score?.total != null && (
                  <Text variant="bodyMd" color="secondary">{outfit.score.total}/100 match</Text>
                )}
              </View>
              {createPlan.isPending ? (
                <LoadingSpinner />
              ) : (
                <MaterialCommunityIcons name="chevron-right" size={20} color={colors.secondary} />
              )}
            </Pressable>
          ))}
        </View>
      )}

      <BottomSheet visible={pickerOpen} onClose={() => setPickerOpen(false)} title="Saved Outfits">
        <OutfitPicker onSelect={handlePickSaved} />
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.stackSm,
  },
  planHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.stackMd },
  outfitName: { marginTop: spacing.stackMd },
  whyItWorks: { marginTop: spacing.stackSm },
  previewWrap: { alignItems: 'center', marginVertical: spacing.stackXl },
  viewDetailLabel: { marginTop: spacing.stackSm, textDecorationLine: 'underline' },
  actionsRow: { flexDirection: 'row', gap: spacing.stackSm, marginBottom: spacing.stackMd },
  actionFlex: { flex: 1 },
  changeButton: { marginBottom: spacing.stackLg },
  emptyTitle: { marginTop: spacing.stackMd },
  emptySubtitle: { marginTop: spacing.stackSm, marginBottom: spacing.stackLg },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.lg,
    padding: spacing.stackMd,
    marginBottom: spacing.stackMd,
  },
  optionText: { flex: 1, marginHorizontal: spacing.stackMd },
  weatherLine: { marginBottom: spacing.stackMd },
  occasionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.stackSm, marginBottom: spacing.stackLg },
  occasionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.full,
    paddingHorizontal: spacing.stackMd,
    paddingVertical: 10,
  },
  occasionChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  occasionLabel: { marginLeft: 6 },
  generateButton: { marginBottom: spacing.stackLg },
  candidateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.lg,
    padding: spacing.stackMd,
    marginBottom: spacing.stackMd,
  },
  candidateInfo: { flex: 1, marginLeft: spacing.stackMd },
});
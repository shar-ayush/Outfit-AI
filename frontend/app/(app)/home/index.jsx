// app/(app)/home/index.jsx
//
// Matches home_dashboard/code.html section-for-section: greeting+weather,
// dismissible insights banner, hero "Today's Recommendation" card, quick
// actions row, "Not worn lately" snapshot.
//
// DATA NOTE: the sleeping-items query powers BOTH the dismissible insights
// banner ("N items sleeping...") AND the WardrobeSnapshot row below —
// they're the same underlying "not worn in 60+ days" data, so one query
// serves both rather than fabricating a separate "recently unworn" concept
// the backend doesn't otherwise expose.
//
// DAILY SUGGESTION NOVELTY: this screen keeps its own local `sessionId`
// (separate from the Stylist tab's chat session) so that tapping Refresh
// multiple times benefits from the backend's novelty penalty — repeated
// suggestions won't just show the exact same outfit again. This session
// is scoped to this screen instance; it's intentionally not persisted to
// stylistStore since the Home daily card isn't a "conversation".

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Screen from '@/components/common/Screen';
import Text from '@/components/common/Text';
import WeatherWidget from '@/components/home/WeatherWidget';
import DailyOutfitCard from '@/components/home/DailyOutfitCard';
import QuickActions from '@/components/home/QuickActions';
import WardrobeSnapshot from '@/components/home/WardrobeSnapshot';
import Badge from '@/components/common/Badge';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { useAuthStore, useUIStore } from '@/stores';
import { useWeather } from '@/hooks/useWeather';
import { useSuggestOutfits, useOutfitAction } from '@/hooks/useOutfits';
import { useSleepingItems } from '@/hooks/useAnalytics';
import { getGreeting, getDayOfWeekLabel } from '@/utils/dateUtils';
import { colors, spacing, radius } from '@/theme';

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);

  const { data: weather, isLoading: weatherLoading } = useWeather();
  const { data: sleeping, isLoading: sleepingLoading } = useSleepingItems();
  const suggestOutfits = useSuggestOutfits();
  const outfitAction = useOutfitAction();

  const [dailySessionId, setDailySessionId] = useState(null);
  const [currentOutfit, setCurrentOutfit] = useState(null);
  const [suggestMessage, setSuggestMessage] = useState(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // 'worn' | 'saved' | null

  const buildDailyQuery = useCallback(() => {
    const day = getDayOfWeekLabel();
    if (weather) {
      return `Suggest a casual outfit for ${day}, ${weather.temperature}°C, ${weather.condition.toLowerCase()}`;
    }
    return `Suggest a casual outfit for ${day}`;
  }, [weather]);

  const requestSuggestion = useCallback(
    (isRefresh = false) => {
      suggestOutfits.mutate(
        {
          query: buildDailyQuery(),
          sessionId: isRefresh ? dailySessionId : null,
          count: 1,
          weatherContext: weather
            ? { temperature: weather.temperature, condition: weather.condition }
            : null,
        },
        {
          onSuccess: (result) => {
            setCurrentOutfit(result.outfits?.[0] || null);
            setSuggestMessage(result.message || null);
            setDailySessionId(result.sessionId || dailySessionId);
          },
          onError: () => {
            showToast('Could not generate a suggestion right now', 'error');
          },
        }
      );
    },
    [buildDailyQuery, dailySessionId, weather]
  );

  // Fetch the initial daily suggestion exactly once, as soon as the weather
  // query settles (success OR error/denied-permission) — using a ref guard
  // rather than a dependency-array trick so a later weather refetch never
  // causes a second, redundant suggestion call.
  const hasRequestedInitial = React.useRef(false);
  useEffect(() => {
    if (weatherLoading || hasRequestedInitial.current) return;
    hasRequestedInitial.current = true;
    requestSuggestion(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weatherLoading]);

  const handleWornToday = () => {
    if (!currentOutfit) return;
    // Full occasion/rating capture happens in the log-wear modal (built in
    // a later step) — navigate there with the outfit context pre-filled.
    router.push({
      pathname: '/(modals)/log-wear',
      params: { outfitId: currentOutfit.outfitId, recommendationId: currentOutfit.recommendationId },
    });
  };

  const handleSave = () => {
    if (!currentOutfit) return;
    setActionLoading('saved');
    outfitAction.mutate(
      { outfitId: currentOutfit.outfitId, action: 'saved', recommendationId: currentOutfit.recommendationId },
      {
        onSuccess: () => {
          showToast('Outfit saved', 'success');
          setCurrentOutfit((prev) => (prev ? { ...prev, isSaved: true } : prev));
        },
        onError: () => showToast('Could not save this outfit', 'error'),
        onSettled: () => setActionLoading(null),
      }
    );
  };

  const handleRefresh = () => requestSuggestion(true);

  const sleepingItems = sleeping?.items || [];
  const sleepingCount = sleeping?.count || 0;

  return (
    <Screen scroll edges={['top']}>
      <View style={styles.greetingRow}>
        <Text variant="displayLg">
          {getGreeting()}
          {user?.username ? `, ${user.username}` : ''}
        </Text>
        <WeatherWidget />
      </View>

      {!bannerDismissed && sleepingCount > 5 && (
        <Pressable
          style={styles.banner}
          onPress={() => router.push('/(app)/profile/analytics')}
        >
          <View style={styles.bannerContent}>
            <View style={styles.bannerIcon}>
              <MaterialCommunityIcons name="creation" size={16} color={colors.onTertiaryContainer} />
            </View>
            <Text variant="titleMd" style={styles.bannerText}>
              {sleepingCount} items sleeping in your wardrobe...
            </Text>
          </View>
          <Pressable onPress={() => setBannerDismissed(true)} hitSlop={8}>
            <MaterialCommunityIcons name="close" size={18} color={colors.tertiary} />
          </Pressable>
        </Pressable>
      )}

      <View style={styles.section}>
        <DailyOutfitCard
          outfit={currentOutfit}
          message={suggestMessage}
          isLoading={suggestOutfits.isPending && !currentOutfit}
          isRefreshing={suggestOutfits.isPending && !!currentOutfit}
          isActionLoading={actionLoading}
          onWornToday={handleWornToday}
          onSave={handleSave}
          onRefresh={handleRefresh}
        />
      </View>

      <View style={styles.section}>
        <QuickActions onNavigate={(route) => router.push(route)} />
      </View>

      <View style={styles.section}>
        <WardrobeSnapshot items={sleepingItems} isLoading={sleepingLoading} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: spacing.stackSm,
    marginBottom: spacing.stackLg,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.goldAccentLight,
    borderWidth: 1,
    borderColor: '#E6D8B3',
    borderRadius: radius.DEFAULT,
    padding: spacing.stackMd,
    marginBottom: spacing.stackLg,
  },
  bannerContent: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: spacing.stackSm },
  bannerIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.goldAccent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.stackSm,
  },
  bannerText: { color: colors.tertiary, flex: 1 },
  section: { marginBottom: spacing.stackXl },
});

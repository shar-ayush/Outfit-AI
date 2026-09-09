import React, { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import Screen from '@/components/common/Screen';
import Text from '@/components/common/Text';
import WeatherWidget from '@/components/home/WeatherWidget';
import DailyOutfitCard from '@/components/home/DailyOutfitCard';
import TodayPlannedOutfitCard from '@/components/home/TodayPlannedOutfitCard';
import QuickActions from '@/components/home/QuickActions';
import WardrobeSnapshot from '@/components/home/WardrobeSnapshot';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore, useUIStore } from '@/stores';
import { useWeather } from '@/hooks/useWeather';
import { useDailyOutfit, useRefreshDailyOutfit, useOutfitAction } from '@/hooks/useOutfits';
import { useWardrobeStats } from '@/hooks/useWardrobe';
import { useSleepingItems } from '@/hooks/useAnalytics';
import { useDayPlan } from '@/hooks/usePlans';
import { getGreeting, toISODateString } from '@/utils/dateUtils';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { colors, spacing, radius } from '@/theme';

export default function HomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);

  const { data: weather, isLoading: weatherLoading } = useWeather();
  const { data: wardrobeStats, isLoading: wardrobeStatsLoading } = useWardrobeStats();
  const { data: sleeping, isLoading: sleepingLoading } = useSleepingItems();
  const outfitAction = useOutfitAction();
  const refreshDailyOutfit = useRefreshDailyOutfit();

  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const hasClothes = Boolean(wardrobeStats?.totalItems && wardrobeStats.totalItems > 0);

  const todayDateStr = toISODateString(new Date());

  const weatherContext = useMemo(() => {
    return weather
      ? { temperature: weather.temperature, condition: weather.condition }
      : null;
  }, [weather]);

  const {
    data: dailyData,
    isLoading: dailyLoading,
    refetch: refetchDaily,
  } = useDailyOutfit(todayDateStr, weatherContext, {
    enabled: !weatherLoading && !wardrobeStatsLoading && hasClothes,
  });

  const currentOutfit = dailyData?.outfit || null;

  useFocusEffect(
    useCallback(() => {
      if (hasClothes) {
        refetchDaily();
      }
    }, [refetchDaily, hasClothes])
  );

  const { data: todayPlan, isLoading: todayPlanLoading } = useDayPlan(todayDateStr);

  const weatherNudge = useMemo(() => {
    if (!weather || !dailyData?.weatherAtRecommendation || !currentOutfit) {
      return null;
    }

    const recWeather = dailyData.weatherAtRecommendation;
    const currentTemp = Math.round(weather.temperature);
    const recTemp = Math.round(recWeather.temperature);
    const tempDelta = currentTemp - recTemp;

    const currentCondition = (weather.condition || '').toLowerCase();
    const recCondition = (recWeather.condition || '').toLowerCase();

    const isRain = (cond) => /rain|drizzle|shower|thunderstorm|storm/.test(cond);
    const isSnow = (cond) => /snow|flurry|blizzard|sleet/.test(cond);

    if (isRain(currentCondition) && !isRain(recCondition)) {
      return {
        type: 'rain',
        icon: 'weather-pouring',
        message: `Rain detected (${currentTemp}°C). Tap to adjust outfit for wet weather.`,
      };
    }

    if (isSnow(currentCondition) && !isSnow(recCondition)) {
      return {
        type: 'snow',
        icon: 'weather-snowy-heavy',
        message: `Snow detected (${currentTemp}°C). Tap to adjust outfit for cold weather.`,
      };
    }

    if (Math.abs(tempDelta) >= 5) {
      if (tempDelta > 0) {
        return {
          type: 'temp_warm',
          icon: 'thermometer-chevron-up',
          message: `Warmed up to ${currentTemp}°C (was ${recTemp}°C). Tap to adjust for warmer weather.`,
        };
      } else {
        return {
          type: 'temp_cold',
          icon: 'thermometer-chevron-down',
          message: `Cooled down to ${currentTemp}°C (was ${recTemp}°C). Tap to adjust for cooler weather.`,
        };
      }
    }

    return null;
  }, [weather, dailyData, currentOutfit]);

  const handleWornToday = () => {
    if (!currentOutfit) return;
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
          queryClient.setQueryData(QUERY_KEYS.DAILY_OUTFIT(todayDateStr), (prev) => {
            if (!prev?.outfit) return prev;
            return {
              ...prev,
              outfit: { ...prev.outfit, isSaved: true },
            };
          });
        },
        onError: () => showToast('Could not save this outfit', 'error'),
        onSettled: () => setActionLoading(null),
      }
    );
  };

  const handleRefresh = () => {
    if (!hasClothes) {
      showToast('Add a few wardrobe items to get outfit suggestions', 'info');
      return;
    }
    refreshDailyOutfit.mutate(
      {
        date: todayDateStr,
        weatherContext,
      },
      {
        onSuccess: () => {
          showToast('Updated recommendation for today', 'success');
        },
        onError: () => {
          showToast('Could not refresh suggestion right now', 'error');
        },
      }
    );
  };

  const handleWeatherRefresh = () => {
    if (!hasClothes) return;
    refreshDailyOutfit.mutate(
      {
        date: todayDateStr,
        weatherContext,
        reason: weatherNudge?.type || null,
      },
      {
        onSuccess: () => {
          showToast('Adjusted recommendation for current weather', 'success');
        },
        onError: () => {
          showToast('Could not refresh suggestion right now', 'error');
        },
      }
    );
  };

  const handleAskStylist = () => {
    if (dailyData?.sessionId) {
      router.push({
        pathname: '/(app)/stylist',
        params: { sessionId: dailyData.sessionId },
      });
    } else {
      router.push('/(app)/stylist');
    }
  };

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
          message={
            !hasClothes
              ? 'Add a few wardrobe items to get your first outfit suggestion.'
              : dailyData?.message
          }
          isLoading={hasClothes && (dailyLoading || (wardrobeStatsLoading && !wardrobeStats)) && !currentOutfit}
          isRefreshing={refreshDailyOutfit.isPending}
          isActionLoading={actionLoading}
          weatherNudge={weatherNudge}
          onWornToday={handleWornToday}
          onSave={handleSave}
          onRefresh={handleRefresh}
          onWeatherRefresh={handleWeatherRefresh}
          onAskStylist={handleAskStylist}
          onAddClothes={() => router.push('/(app)/wardrobe/upload')}
        />
      </View>
      <TodayPlannedOutfitCard
        plan={todayPlan}
        isLoading={todayPlanLoading}
        onOpenPlan={() => router.push(`/(app)/planner/${todayDateStr}`)}
        onViewOutfitDetail={(outfitId) =>
          router.push({ pathname: '/(modals)/outfit-detail', params: { outfitId } })
        }
      />
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

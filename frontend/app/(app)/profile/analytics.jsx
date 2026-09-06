// app/(app)/profile/analytics.jsx
//
// Every section here reads directly from GET /api/analytics/dashboard -
// one call, per analyticsService.getDashboardSummary. Sleeping items
// (dropped from a separate nav destination on the Profile home screen)
// lives here since that's where the backend already aggregates it.
//
// Reuses Home's WardrobeSnapshot for the sleeping-items row rather than
// building a near-identical component - same shape, same real data
// source, no reason to duplicate it.

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Screen from '@/components/common/Screen';
import Text from '@/components/common/Text';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorState from '@/components/common/ErrorState';
import { UtilizationRing, StatCard, CostPerWearList, WearFrequencyBar } from '@/components/analytics';
import WardrobeSnapshot from '@/components/home/WardrobeSnapshot';
import { useDashboard } from '@/hooks/useAnalytics';
import { colors, spacing } from '@/theme';

export default function AnalyticsScreen() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useDashboard();

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (isError || !data) return <ErrorState onRetry={refetch} />;

  const { utilization, sleeping, topWorn, neverWorn, bestValue, worstValue, spendSummary } = data;

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.primary} />
        </Pressable>
        <Text variant="titleMd">Analytics & ROI</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.ringSection}>
        <UtilizationRing percentage={utilization.utilizationRate} label="Ever Worn" />
        <Text variant="bodyMd" color="secondary" style={styles.ringCaption}>
          {utilization.everWorn} of {utilization.totalItems} items ever worn ·{' '}
          {utilization.monthlyActiveRate}% active this month
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <StatCard label="Total Items" value={utilization.totalItems} />
        <StatCard label="Total Value" value={`₹${utilization.totalWardrobeValue}`} />
        <StatCard label="Avg Cost/Wear" value={`₹${spendSummary.avgCostPerWear}`} />
        <StatCard label="Worn This Month" value={utilization.wornThisMonth} />
      </View>

      {bestValue.length > 0 && (
        <View style={styles.section}>
          <Text variant="headlineSm" style={styles.sectionTitle}>Your Best Purchases</Text>
          <CostPerWearList items={bestValue} tone="success" />
        </View>
      )}

      {worstValue.length > 0 && (
        <View style={styles.section}>
          <Text variant="headlineSm" style={styles.sectionTitle}>Consider Wearing These More</Text>
          <CostPerWearList items={worstValue} tone="error" />
        </View>
      )}

      {topWorn.length > 0 && (
        <View style={styles.section}>
          <Text variant="headlineSm" style={styles.sectionTitle}>Most Worn</Text>
          <WearFrequencyBar items={topWorn} />
        </View>
      )}

      {sleeping.count > 0 && (
        <View style={styles.section}>
          <WardrobeSnapshot items={sleeping.items} isLoading={false} />
        </View>
      )}

      {neverWorn.length > 0 && (
        <View style={styles.section}>
          <Text variant="headlineSm" style={styles.sectionTitle}>Never Worn</Text>
          <CostPerWearList
            items={neverWorn.map((i) => ({ ...i, costPerWear: i.purchasePrice || '—' }))}
            tone="error"
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.stackSm,
    marginBottom: spacing.stackMd,
  },
  ringSection: { alignItems: 'center', marginBottom: spacing.stackLg },
  ringCaption: { textAlign: 'center', marginTop: spacing.stackMd, maxWidth: 260 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.stackMd,
    marginBottom: spacing.stackXl,
  },
  section: { marginBottom: spacing.stackXl },
  sectionTitle: { marginBottom: spacing.stackMd },
});

// app/(app)/planner/index.jsx
//
// Backed entirely by GET /api/plans/week, which already returns a
// pre-filled 7-day structure (backend fills gaps with `plan: null` -
// see planController.getWeekPlan) - no client-side date-gap logic needed.

import React, { useState } from 'react';
import { View, ScrollView, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { addWeeks, subWeeks, format } from 'date-fns';
import { parseLocalDate } from '@/utils/dateUtils';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Screen from '@/components/common/Screen';
import Text from '@/components/common/Text';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorState from '@/components/common/ErrorState';
import { WeekCalendar, DayCard } from '@/components/planner';
import { useWeekPlan } from '@/hooks/usePlans';
import { colors, spacing } from '@/theme';

export default function PlannerScreen() {
  const router = useRouter();
  const [weekStart, setWeekStart] = useState(new Date());

  const { data: week, isLoading, isError, refetch } = useWeekPlan(weekStart);

  const handlePrevWeek = () => setWeekStart((d) => subWeeks(d, 1));
  const handleNextWeek = () => setWeekStart((d) => addWeeks(d, 1));

  const rangeLabel = week && week.length >= 7
    ? `${format(parseLocalDate(week[0].date), 'MMM d')} - ${format(parseLocalDate(week[6].date), 'MMM d')}`
    : '';

  return (
    <Screen edges={['top']} padded={false}>
      <View style={styles.header}>
        <Text variant="displayMd">Weekly Planner</Text>
        <View style={styles.weekNav}>
          <Pressable onPress={handlePrevWeek} hitSlop={8}>
            <MaterialCommunityIcons name="chevron-left" size={22} color={colors.onSurface} />
          </Pressable>
          <Text variant="bodyMd" color="secondary" style={styles.rangeLabel}>
            {rangeLabel}
          </Text>
          <Pressable onPress={handleNextWeek} hitSlop={8}>
            <MaterialCommunityIcons name="chevron-right" size={22} color={colors.onSurface} />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <LoadingSpinner fullScreen />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <>
          <WeekCalendar
            week={week}
            selectedDate={null}
            onSelectDate={(date) => router.push(`/(app)/planner/${date}`)}
          />

          <ScrollView
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
          >
            {week.map((day) => (
              <DayCard key={day.date} day={day} onPress={() => router.push(`/(app)/planner/${day.date}`)} />
            ))}
          </ScrollView>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.gutter, paddingVertical: spacing.stackMd },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.stackSm,
  },
  rangeLabel: { marginHorizontal: spacing.stackMd },
  list: { padding: spacing.gutter, paddingTop: spacing.stackLg },
});

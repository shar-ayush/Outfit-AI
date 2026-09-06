// src/components/planner/WeekCalendar.jsx
//
// Backed by the real GET /api/plans/week response - each day already
// carries { date, dayOfWeek, plan } from the backend's fill-the-gaps
// logic (planController.getWeekPlan), so "empty circle vs filled" reads
// directly off `plan === null`.

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { isToday } from 'date-fns';
import Text from '@/components/common/Text';
import { colors, radius, spacing } from '@/theme';

export default function WeekCalendar({ week = [], selectedDate, onSelectDate }) {
  return (
    <View style={styles.row}>
      {week.map((day) => {
        const dateObj = new Date(day.date);
        const today = isToday(dateObj);
        const selected = day.date === selectedDate;
        const thumbUri = day.plan?.outfitId?.items?.[0]?.clothId?.imageUrl;

        return (
          <Pressable key={day.date} style={styles.dayColumn} onPress={() => onSelectDate(day.date)}>
            <Text variant="caption" color="secondary">
              {day.dayOfWeek.slice(0, 1)}
            </Text>
            <View
              style={[
                styles.dateCircle,
                selected && styles.dateCircleSelected,
                today && !selected && styles.dateCircleToday,
              ]}
            >
              {thumbUri ? (
                <Image source={{ uri: thumbUri }} style={styles.thumbImage} contentFit="cover" />
              ) : (
                <Text variant="bodyMd" color={selected ? 'onPrimary' : 'onSurface'} style={styles.dateNumber}>
                  {dateObj.getDate()}
                </Text>
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.gutter },
  dayColumn: { alignItems: 'center', gap: 6 },
  dateCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dateCircleSelected: { backgroundColor: colors.primary },
  dateCircleToday: { borderWidth: 2, borderColor: colors.goldAccent },
  dateNumber: { fontFamily: 'Inter_600SemiBold' },
  thumbImage: { width: '100%', height: '100%' },
});

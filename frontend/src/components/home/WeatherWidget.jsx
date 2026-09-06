// src/components/home/WeatherWidget.jsx
//
// Matches home_dashboard's weather pill exactly: rounded-full, low-surface
// bg, gold sun icon, temperature in label-caps. Tapping shows a toast with
// the fuller condition text since there's no dedicated weather-detail
// screen in the plan ("Tapping weather opens a detail view" was aspirational
// scope — a full detail screen adds a route for one line of extra text,
// so a toast serves the same purpose without the overhead).

import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Text from '@/components/common/Text';
import { useWeather } from '@/hooks/useWeather';
import { useUIStore } from '@/stores';
import { colors, radius, spacing } from '@/theme';

export default function WeatherWidget() {
  const { data: weather, isLoading, isError } = useWeather();
  const showToast = useUIStore((s) => s.showToast);

  if (isLoading) {
    return (
      <View style={styles.pill}>
        <Text variant="labelCaps" color="secondary">···</Text>
      </View>
    );
  }

  if (isError || !weather) {
    return null; // fail silently — daily outfit card falls back to no weather context
  }

  return (
    <Pressable
      style={styles.pill}
      onPress={() => showToast(`${weather.condition}, ${weather.temperature}°C`, 'info')}
    >
      <MaterialCommunityIcons name={weather.icon} size={14} color={colors.goldAccent} />
      <Text variant="labelCaps" style={styles.temp}>
        {weather.temperature}°C
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.full,
    paddingHorizontal: spacing.stackMd,
    paddingVertical: 6,
    gap: 6,
  },
  temp: { color: colors.onSurface },
});

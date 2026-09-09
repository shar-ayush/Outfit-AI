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
    return null;
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

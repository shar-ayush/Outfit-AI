// src/components/analytics/CostPerWearList.jsx
//
// Reused for both "Best Investments" (bestValue, tone="success") and
// "Worst Investments" (worstValue, tone="error") - both come from the same
// real backend field (analyticsService.getCostPerWearAnalytics), just
// sorted/sliced differently server-side.

import React from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Text from '@/components/common/Text';
import { colors, spacing, radius } from '@/theme';

export default function CostPerWearList({ items = [], tone = 'success' }) {
  const router = useRouter();

  if (items.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {items.map((item) => (
        <Pressable
          key={item._id}
          style={styles.card}
          onPress={() => router.push(`/(app)/wardrobe/${item._id}`)}
        >
          <View style={styles.imageWrap}>
            <Image source={{ uri: item.imageUrl }} style={styles.image} contentFit="contain" />
          </View>
          <Text variant="bodyMd" numberOfLines={1} style={styles.name}>
            {item.name || item.subCategory}
          </Text>
          <Text variant="caption" color="secondary">
            {item.wearCount || 0} wears
          </Text>
          <Text variant="titleSm" color={tone} style={styles.cpw}>
            {item.purchaseCurrency || ''} {item.costPerWear}/wear
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.stackMd },
  card: {
    width: 130,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.lg,
    padding: spacing.stackSm,
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    marginBottom: spacing.stackSm,
  },
  image: { width: '100%', height: '100%', padding: 8 },
  name: { marginBottom: 2 },
  cpw: { marginTop: 4 },
});

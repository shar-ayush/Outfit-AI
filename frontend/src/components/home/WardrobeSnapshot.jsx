// src/components/home/WardrobeSnapshot.jsx
//
// Matches home_dashboard's "Not worn lately" horizontal scroll row.
// Backed by the sleeping-items endpoint (not worn 60+ days) — see
// home/index.jsx header comment for why this powers both the snapshot row
// and the insights banner from a single query.

import React from 'react';
import { View, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Text from '@/components/common/Text';
import EmptyState from '@/components/common/EmptyState';
import { colors, spacing, radius } from '@/theme';

export default function WardrobeSnapshot({ items = [], isLoading }) {
  const router = useRouter();

  if (!isLoading && items.length === 0) return null; // nothing sleeping — don't clutter Home

  return (
    <View>
      <View style={styles.header}>
        <Text variant="headlineSm">Not worn lately</Text>
        <Pressable onPress={() => router.push('/(app)/profile/analytics')}>
          <Text variant="bodyMd" color="secondary">
            View all
          </Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {items.slice(0, 8).map((item) => (
          <Pressable
            key={item._id}
            style={styles.thumb}
            onPress={() => router.push(`/(app)/wardrobe/${item._id}`)}
          >
            <Image source={{ uri: item.imageUrl }} style={styles.image} contentFit="cover" />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.stackMd,
  },
  row: { gap: spacing.stackMd },
  thumb: {
    width: 108,
    height: 108,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainer,
  },
  image: { width: '100%', height: '100%' },
});

// src/components/planner/OutfitPicker.jsx
//
// Backed by the real GET /api/outfits/saved endpoint (useSavedOutfits,
// already built in useOutfits.js).

import React from 'react';
import { View, Pressable, ScrollView, StyleSheet } from 'react-native';
import Text from '@/components/common/Text';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import OutfitItemsRow from '@/components/outfit/OutfitItemsRow';
import { useSavedOutfits } from '@/hooks/useOutfits';
import { colors, spacing } from '@/theme';

export default function OutfitPicker({ onSelect }) {
  const { data, isLoading } = useSavedOutfits(1);
  const outfits = data?.outfits || [];

  if (isLoading) return <LoadingSpinner />;

  if (outfits.length === 0) {
    return (
      <EmptyState
        icon="bookmark-outline"
        title="No saved outfits yet"
        description="Save outfits from the Stylist or Home to pick from them here."
      />
    );
  }

  return (
    <ScrollView style={styles.list}>
      {outfits.map((outfit) => (
        <Pressable key={outfit._id} style={styles.row} onPress={() => onSelect(outfit)}>
          <OutfitItemsRow items={outfit.items || []} size={48} />
          <View style={styles.info}>
            <Text variant="bodyLg" numberOfLines={1}>
              {outfit.outfitName || 'Saved outfit'}
            </Text>
            {outfit.occasion && (
              <Text variant="bodyMd" color="secondary">
                {outfit.occasion}
              </Text>
            )}
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { maxHeight: 400 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.stackMd,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHigh,
  },
  info: { marginLeft: spacing.stackMd, flex: 1 },
});

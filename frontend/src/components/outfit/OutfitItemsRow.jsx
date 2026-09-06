// src/components/outfit/OutfitItemsRow.jsx
//
// Extracted after writing the same "row of item thumbnails" markup for the
// third time (DailyOutfitCard, ChatOutfitCard, now Planner's DayCard) -
// consolidated into one shared component rather than a fourth copy.
// Works against Outfit.items[].clothId shape whether populated as a full
// object or already flattened (both occur across different endpoints:
// /plans/week populates items.clothId, while /outfits/suggest returns
// items already flattened onto the outfit object directly).

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { colors, radius } from '@/theme';

export default function OutfitItemsRow({ items = [], size = 56 }) {
  const normalized = items.map((item) => item.clothId || item);

  return (
    <View style={styles.row}>
      {normalized.slice(0, 4).map((item, i) => (
        <View
          key={item._id || i}
          style={[
            styles.thumb,
            { width: size, height: size, marginLeft: i > 0 ? -size * 0.25 : 0, zIndex: normalized.length - i },
          ]}
        >
          <Image source={{ uri: item.imageUrl }} style={styles.image} contentFit="contain" />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  thumb: {
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 2,
    borderColor: colors.surfaceContainerLowest,
    overflow: 'hidden',
    padding: 4,
  },
  image: { width: '100%', height: '100%' },
});

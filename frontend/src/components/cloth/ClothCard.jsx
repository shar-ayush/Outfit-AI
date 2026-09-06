// src/components/cloth/ClothCard.jsx
//
// Matches wardrobe_grid's card: contained (not cropped) image on a light
// surface-container-low panel, category label + color dot row below, wear
// count with an icon.
//
// GRID LAYOUT NOTE: the mock uses a true CSS masonry grid (`columns-2`)
// with variable card heights per image aspect ratio. React Native has no
// native masonry primitive, and FlashList (chosen for wardrobe's 200+ item
// performance per the plan) requires uniform row heights to virtualize
// correctly. We use a fixed 3:4 aspect ratio for every card instead — a
// deliberate, common RN simplification, not an oversight.
//
// REMOVED FROM THE MOCK: a gold "New" badge for recently-uploaded items.
// The backend has no `isNew` concept — it was a client-side guess
// (createdAt < 48h) dressed up as a system statement. Backend-grounded UI
// only shows what the data actually supports.

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Text from '@/components/common/Text';
import { colors, spacing, radius, shadows } from '@/theme';
import { COLOR_HEX_MAP } from '@/constants/categories';

const CATEGORY_LABELS = {
  top: 'Tops',
  bottom: 'Bottoms',
  footwear: 'Footwear',
  outerwear: 'Outerwear',
  accessory: 'Accessories',
  full_body: 'Full Body',
};

export default function ClothCard({ cloth, onPress }) {
  const colorHex = cloth.color?.hex || COLOR_HEX_MAP[cloth.color?.primary] || colors.surfaceContainerHigh;

  return (
    <Pressable onPress={onPress} style={[styles.card, shadows.xs]}>
      <View style={styles.imageWrap}>
        <Image source={{ uri: cloth.imageUrl }} style={styles.image} contentFit="contain" transition={150} />
      </View>

      <View style={styles.meta}>
        <View style={styles.metaRow}>
          <Text variant="labelCaps" color="secondary" numberOfLines={1}>
            {CATEGORY_LABELS[cloth.category] || cloth.category}
          </Text>
          <View style={[styles.colorDot, { backgroundColor: colorHex }]} />
        </View>
        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="repeat" size={12} color={colors.secondary} />
          <Text variant="caption" color="secondary" style={styles.wearCount}>
            {cloth.wearCount || 0} wears
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
    overflow: 'hidden',
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.stackMd,
  },
  image: { width: '100%', height: '100%' },
  meta: { padding: spacing.stackSm, gap: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  colorDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: colors.outlineVariant },
  wearCount: { marginLeft: 4 },
});


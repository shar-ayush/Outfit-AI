// src/components/home/DailyOutfitCard.jsx
//
// Matches home_dashboard's "Today's Recommendation" hero section: a
// horizontal strip of item thumbnails (each with a category label chip),
// then name/badges/why-it-works copy, then Worn Today / Save / Refresh
// actions.
//
// REMOVED FROM THE MOCK: a gold "AI Curated" badge in the header. Every
// outfit from POST /outfits/suggest is AI-generated — there's no backend
// flag this badge represents, it's a label restating something
// always-true. Backend-grounded UI shouldn't manufacture a badge for a
// fact that isn't a distinguishing piece of data.

import React from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Text from '@/components/common/Text';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Tag from '@/components/common/Tag';
import { SkeletonOutfitCard } from '@/components/common/SkeletonLoader';
import EmptyState from '@/components/common/EmptyState';
import { colors, spacing, radius } from '@/theme';

export default function DailyOutfitCard({
  outfit,
  message,
  isLoading,
  isRefreshing,
  isActionLoading,
  weatherNudge,
  onWornToday,
  onSave,
  onRefresh,
}) {
  return (
    <View>
      <Text variant="headlineSm" style={styles.header}>
        Today's Recommendation
      </Text>

      {isLoading || isRefreshing ? (
        <SkeletonOutfitCard />
      ) : !outfit ? (
        <Card>
          <EmptyState
            icon="tshirt-crew-outline"
            title="No suggestion yet"
            description={message || 'Add a few wardrobe items to get your first outfit suggestion.'}
          />
        </Card>
      ) : (
        <Card noPadding elevated>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itemsRow}>
            {(outfit.items || []).map((item, i) => {
              const cloth = item?.clothId && typeof item.clothId === 'object' ? item.clothId : item;
              const imageUrl = cloth?.imageUrl || item?.imageUrl;
              const label = cloth?.subCategory || item?.subCategory || cloth?.category || item?.category;
              return (
                <View
                  key={cloth?._id || item?._id || i}
                  style={[styles.itemThumb, i < outfit.items.length - 1 && styles.itemThumbBorder]}
                >
                  <Image source={{ uri: imageUrl }} style={styles.itemImage} contentFit="contain" />
                  {label && (
                    <View style={styles.categoryChip}>
                      <Text variant="caption" style={styles.categoryChipText}>
                        {label}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.infoSection}>
            <Text variant="displayMd" style={styles.outfitName}>
              {outfit.outfitName}
            </Text>

            <View style={styles.badgeRow}>
              {outfit.vibe && <Tag label={outfit.vibe} variant="static" />}
              {outfit.items[0]?.formality && (
                <Tag label={outfit.items[0].formality} variant="static" style={styles.badgeSpacing} />
              )}
            </View>

            {outfit.whyItWorks && (
              <Text variant="bodyLg" color="secondary" style={styles.whyItWorks}>
                <Text variant="titleSm">Why it works: </Text>
                {outfit.whyItWorks}
              </Text>
            )}

            {weatherNudge && (
              <Pressable
                style={styles.weatherNudgeBanner}
                onPress={onRefresh}
                android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
              >
                <View style={styles.weatherNudgeIconContainer}>
                  <MaterialCommunityIcons
                    name={weatherNudge.icon || 'weather-cloudy-alert'}
                    size={18}
                    color={colors.tertiary}
                  />
                </View>
                <View style={styles.weatherNudgeTextContainer}>
                  <Text variant="labelMd" style={styles.weatherNudgeTitle}>
                    Weather Update
                  </Text>
                  <Text variant="bodySm" color="secondary" style={styles.weatherNudgeMessage}>
                    {weatherNudge.message}
                  </Text>
                </View>
                <MaterialCommunityIcons name="refresh" size={18} color={colors.primary} />
              </Pressable>
            )}

            <View style={styles.actionsRow}>
              <Button
                onPress={onWornToday}
                loading={isActionLoading === 'worn'}
                style={styles.actionButtonFlex}
                fullWidth={false}
              >
                Worn Today
              </Button>
              <Button
                variant="secondary"
                onPress={onSave}
                loading={isActionLoading === 'saved'}
                style={styles.actionButtonFlex}
                fullWidth={false}
              >
                Save
              </Button>
              <Button variant="secondary" icon="refresh" size="icon" onPress={onRefresh} fullWidth={false} />
            </View>
          </View>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.stackMd,
  },
  itemsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHigh,
  },
  itemThumb: { width: 130, aspectRatio: 3 / 4, backgroundColor: colors.surfaceContainer },
  itemThumbBorder: { borderRightWidth: 1, borderRightColor: colors.surfaceContainerHigh },
  itemImage: { width: '100%', height: '100%', padding: 12 },
  categoryChip: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(249,249,249,0.85)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  categoryChipText: { textTransform: 'uppercase', fontFamily: 'Inter_600SemiBold', fontSize: 9 },
  infoSection: { padding: spacing.gutter },
  outfitName: { marginBottom: spacing.stackSm },
  badgeRow: { flexDirection: 'row', marginBottom: spacing.stackMd },
  badgeSpacing: { marginLeft: spacing.stackSm },
  whyItWorks: { marginBottom: spacing.stackLg },
  weatherNudgeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingVertical: spacing.stackSm,
    paddingHorizontal: spacing.stackMd,
    marginBottom: spacing.stackMd,
  },
  weatherNudgeIconContainer: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.stackSm,
  },
  weatherNudgeTextContainer: {
    flex: 1,
    marginRight: spacing.stackSm,
  },
  weatherNudgeTitle: {
    fontFamily: 'Inter_600SemiBold',
    color: colors.onSurface,
  },
  weatherNudgeMessage: {
    marginTop: 1,
  },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.stackSm },
  actionButtonFlex: { flex: 1 },
});

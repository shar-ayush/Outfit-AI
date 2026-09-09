import React from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Text from '@/components/common/Text';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Tag from '@/components/common/Tag';
import { PlanStatusBadge } from '@/components/planner';
import { SkeletonOutfitCard } from '@/components/common/SkeletonLoader';
import { colors, spacing, radius, shadows } from '@/theme';

export default function TodayPlannedOutfitCard({
  plan,
  isLoading,
  onOpenPlan,
  onViewOutfitDetail,
}) {
  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text variant="headlineSm" style={styles.header}>
          Today's Planned Outfit
        </Text>
        <SkeletonOutfitCard />
      </View>
    );
  }

  if (!plan || !plan.outfitId) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text variant="headlineSm">Today's Planned Look</Text>
        </View>

        <Pressable
          style={[styles.emptyPromptCard, shadows.xs]}
          onPress={onOpenPlan}
        >
          <View style={styles.emptyIconWrap}>
            <MaterialCommunityIcons name="calendar-today" size={24} color={colors.primary} />
          </View>
          <View style={styles.emptyTextWrap}>
            <Text variant="titleSm">No outfit planned for today</Text>
            <Text variant="bodyMd" color="secondary" style={styles.emptySubtitle}>
              Design from wardrobe, pick saved, or get AI suggestions
            </Text>
          </View>
          <View style={styles.emptyActionPill}>
            <Text variant="labelMd" color="onPrimary">
              Plan Now
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color={colors.onPrimary} />
          </View>
        </Pressable>
      </View>
    );
  }

  const outfit = plan.outfitId;
  const items = outfit.items || [];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerTitleWrap}>
          <Text variant="headlineSm">Today's Planned Outfit</Text>
          <Text variant="caption" color="secondary">
            Your scheduled look for today
          </Text>
        </View>
        <PlanStatusBadge status={plan.status} />
      </View>

      <Card noPadding elevated style={styles.card}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled={true}
          style={styles.itemsRow}
          contentContainerStyle={styles.itemsScrollContent}
        >
          {items.map((item, i) => {
            const cloth = item?.clothId && typeof item.clothId === 'object' ? item.clothId : item;
            const imageUrl = cloth?.imageUrl || item?.imageUrl;
            const label = cloth?.subCategory || item?.subCategory || cloth?.category || item?.category;

            return (
              <Pressable
                key={cloth?._id || item?._id || i}
                onPress={() => onViewOutfitDetail && onViewOutfitDetail(outfit._id)}
                style={[styles.itemThumb, i < items.length - 1 && styles.itemThumbBorder]}
              >
                <Image source={{ uri: imageUrl }} style={styles.itemImage} contentFit="contain" />
                {label && (
                  <View style={styles.categoryChip}>
                    <Text variant="caption" style={styles.categoryChipText}>
                      {label}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          style={styles.infoSection}
          onPress={() => onViewOutfitDetail && onViewOutfitDetail(outfit._id)}
        >
          <View style={styles.badgeRow}>
            {plan.occasion && <Tag label={plan.occasion} variant="static" />}
            {outfit.vibe && (
              <Tag label={outfit.vibe} variant="static" style={styles.badgeSpacing} />
            )}
          </View>

          <Text variant="displayMd" style={styles.outfitName}>
            {outfit.outfitName || 'Planned Outfit'}
          </Text>

          {outfit.whyItWorks && (
            <Text variant="bodyLg" color="secondary" style={styles.whyItWorks}>
              {outfit.whyItWorks}
            </Text>
          )}

          <View style={styles.actionsRow}>
            <Button
              variant="secondary"
              icon="calendar-edit"
              onPress={onOpenPlan}
              style={styles.fullWidthButton}
            >
              Edit in Planner
            </Button>
          </View>
        </Pressable>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.stackXl,
  },
  header: {
    marginBottom: spacing.stackMd,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.stackMd,
  },
  headerTitleWrap: {
    flex: 1,
  },
  card: {
    overflow: 'hidden',
  },
  itemsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHigh,
  },
  itemsScrollContent: {
    flexDirection: 'row',
  },
  itemThumb: {
    width: 130,
    aspectRatio: 3 / 4,
    backgroundColor: colors.surfaceContainer,
  },
  itemThumbBorder: {
    borderRightWidth: 1,
    borderRightColor: colors.surfaceContainerHigh,
  },
  itemImage: {
    width: '100%',
    height: '100%',
    padding: 12,
  },
  categoryChip: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(249,249,249,0.88)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  categoryChipText: {
    textTransform: 'uppercase',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
  },
  infoSection: {
    padding: spacing.gutter,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: spacing.stackSm,
  },
  badgeSpacing: {
    marginLeft: spacing.stackSm,
  },
  outfitName: {
    marginBottom: spacing.stackSm,
  },
  whyItWorks: {
    marginBottom: spacing.stackLg,
  },
  actionsRow: {
    marginTop: spacing.stackXs,
  },
  fullWidthButton: {
    width: '100%',
  },

  emptyPromptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.lg,
    padding: spacing.stackMd,
  },
  emptyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.stackMd,
  },
  emptyTextWrap: {
    flex: 1,
    marginRight: spacing.stackSm,
  },
  emptySubtitle: {
    marginTop: 2,
  },
  emptyActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
  },
});

// src/components/home/DailyOutfitCard.jsx
//
// Matches home_dashboard's "Today's Recommendation" hero section: a
// horizontal strip of item thumbnails (each with a category label chip),
// then name/badges/why-it-works copy, daily stylist message, customize CTA,
// then Worn Today / Save / Refresh actions.

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
  onWeatherRefresh,
  onAskStylist,
  onAddClothes,
}) {
  const [savedLocally, setSavedLocally] = React.useState(false);

  const currentOutfitId = outfit?.outfitId || outfit?._id;
  React.useEffect(() => {
    setSavedLocally(false);
  }, [currentOutfitId]);

  React.useEffect(() => {
    if (!isActionLoading && !outfit?.isSaved) {
      setSavedLocally(false);
    }
  }, [isActionLoading, outfit?.isSaved]);

  const isSaved = Boolean(outfit?.isSaved || savedLocally);

  const handleSave = () => {
    if (isSaved) return;
    setSavedLocally(true);
    onSave?.();
  };

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
            actionLabel={onAddClothes ? 'Add Clothes' : undefined}
            onAction={onAddClothes}
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

            {message && (
              <View style={styles.stylistMessageContainer}>
                <MaterialCommunityIcons name="creation" size={16} color={colors.goldAccent} style={styles.stylistIcon} />
                <Text variant="bodyMd" color="secondary" style={styles.stylistMessageText}>
                  {message}
                </Text>
              </View>
            )}

            {!message && outfit.whyItWorks && (
              <Text variant="bodyLg" color="secondary" style={styles.whyItWorks}>
                <Text variant="titleSm">Why it works: </Text>
                {outfit.whyItWorks}
              </Text>
            )}

            {/* Weather Nudge Banner */}
            {/* {weatherNudge && (
              <Pressable
                style={styles.weatherNudgeBanner}
                onPress={onWeatherRefresh || onRefresh}
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
            )} */}

            {onAskStylist && (
              <Pressable
                style={styles.customizeBanner}
                onPress={onAskStylist}
                android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
              >
                <View style={styles.customizeLeft}>
                  <View style={styles.customizeIconContainer}>
                    <MaterialCommunityIcons name="chat-processing-outline" size={16} color={colors.primary} />
                  </View>
                  <View style={styles.customizeTextContainer}>
                    <Text variant="labelMd" style={styles.customizeTitle}>
                      Want to customize this look?
                    </Text>
                    <Text variant="caption" color="secondary" style={styles.customizeSubtitle}>
                      Ask Stylist to swap pieces or restyle
                    </Text>
                  </View>
                </View>
                <View style={styles.customizeRight}>
                  <Text variant="labelMd" style={styles.customizeActionText}>
                    Ask Stylist
                  </Text>
                  <MaterialCommunityIcons name="chevron-right" size={16} color={colors.primary} />
                </View>
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
                onPress={handleSave}
                disabled={isSaved}
                loading={isActionLoading === 'saved'}
                style={[styles.actionButtonFlex, isSaved && styles.savedButton]}
                fullWidth={false}
              >
                {isSaved ? 'Saved' : 'Save'}
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
  stylistMessageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.DEFAULT,
    padding: spacing.stackSm,
    marginBottom: spacing.stackMd,
  },
  stylistIcon: {
    marginRight: spacing.stackSm,
    marginTop: 2,
  },
  stylistMessageText: {
    flex: 1,
    lineHeight: 20,
  },
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
  customizeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.stackSm,
    paddingHorizontal: spacing.stackMd,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: spacing.stackMd,
  },
  customizeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.stackSm,
  },
  customizeIconContainer: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.stackSm,
  },
  customizeTextContainer: {
    flex: 1,
  },
  customizeTitle: {
    fontFamily: 'Inter_600SemiBold',
    color: colors.onSurface,
    fontSize: 13,
  },
  customizeSubtitle: {
    marginTop: 1,
    fontSize: 11,
  },
  customizeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  customizeActionText: {
    fontFamily: 'Inter_600SemiBold',
    color: colors.primary,
    fontSize: 13,
  },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.stackSm },
  actionButtonFlex: { flex: 1 },
  savedButton: {
    backgroundColor: colors.surfaceContainerHigh,
    borderColor: colors.outlineVariant,
    opacity: 0.85,
  },
});

import React from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Text from '@/components/common/Text';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Tag from '@/components/common/Tag';
import SkeletonLoader, { SkeletonOutfitCard } from '@/components/common/SkeletonLoader';
import EmptyState from '@/components/common/EmptyState';
import { colors, spacing, radius } from '@/theme';

const GENERATING_STEPS = [
  { icon: 'weather-partly-cloudy', text: "Analyzing today's weather & temperature..." },
  { icon: 'hanger', text: 'Scanning your wardrobe for matching styles...' },
  { icon: 'palette-outline', text: 'Scoring color harmony & silhouettes...' },
  { icon: 'creation', text: 'Finalizing curated look & styling tips...' },
];

function DailyOutfitGeneratingCard({ isRefreshing }) {
  const [stepIndex, setStepIndex] = React.useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % GENERATING_STEPS.length);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  const currentStep = GENERATING_STEPS[stepIndex];

  return (
    <Card noPadding elevated style={styles.generatingCard}>
      <View style={styles.generatingHeader}>
        <View style={styles.generatingBadge}>
          <MaterialCommunityIcons name="creation" size={15} color={colors.goldAccent} />
          <Text variant="labelSm" style={styles.generatingBadgeText}>
            {isRefreshing ? 'Refreshing Look' : 'Stylist AI Active'}
          </Text>
        </View>
        <Text variant="titleSm" style={styles.generatingTitle}>
          {isRefreshing ? 'Re-curating your outfit...' : "Curating today's look with AI..."}
        </Text>
      </View>

      <View style={styles.generatingItemsRow}>
        {[
          { label: 'TOP', icon: 'tshirt-crew-outline' },
          { label: 'BOTTOM', icon: 'hanger' },
          { label: 'SHOES', icon: 'shoe-sneaker' },
        ].map((slot, i) => (
          <View key={slot.label} style={[styles.generatingSlot, i < 2 && styles.generatingSlotBorder]}>
            <View style={styles.generatingSlotContent}>
              <MaterialCommunityIcons name={slot.icon} size={28} color={colors.outlineVariant} />
              <View style={styles.generatingSlotTag}>
                <Text variant="caption" style={styles.generatingSlotTagText}>
                  {slot.label}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.generatingFooter}>
        <View style={styles.stepRow}>
          <MaterialCommunityIcons
            name={currentStep.icon}
            size={16}
            color={colors.primary}
            style={styles.stepIcon}
          />
          <Text variant="bodyMd" style={styles.stepText}>
            {currentStep.text}
          </Text>
        </View>
        <View style={styles.progressBarBackground}>
          <SkeletonLoader height={3} borderRadius={2} />
        </View>
        <Text variant="caption" color="secondary" style={styles.generatingCaption}>
          Selecting the best combination from your wardrobe
        </Text>
      </View>
    </Card>
  );
}

export default function DailyOutfitCard({
  outfit,
  message,
  isLoading,
  isRefreshing,
  isError,
  onRetry,
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
        <DailyOutfitGeneratingCard isRefreshing={isRefreshing} />
      ) : isError && !outfit ? (
        <Card>
          <View style={styles.errorContainer}>
            <View style={styles.errorIconCircle}>
              <MaterialCommunityIcons name="clock-alert-outline" size={28} color={colors.goldAccent} />
            </View>
            <Text variant="titleMd" style={styles.errorTitle}>
              Curating took longer than usual
            </Text>
            <Text variant="bodyMd" color="secondary" style={styles.errorDescription}>
              Gemini is taking extra time to style today's look. Tap below to retry.
            </Text>
            <Button
              variant="primary"
              icon="refresh"
              onPress={onRetry || onRefresh}
              style={styles.retryButton}
              fullWidth={false}
            >
              Retry Recommendation
            </Button>
          </View>
        </Card>
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
  generatingCard: {
    overflow: 'hidden',
  },
  generatingHeader: {
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.gutter,
    paddingBottom: spacing.stackSm,
  },
  generatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.goldAccentLight || 'rgba(201,168,76,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    gap: 4,
    marginBottom: spacing.stackSm,
  },
  generatingBadgeText: {
    color: colors.tertiary,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  generatingTitle: {
    fontFamily: 'Inter_600SemiBold',
    color: colors.onSurface,
  },
  generatingItemsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    height: 140,
  },
  generatingSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generatingSlotBorder: {
    borderRightWidth: 1,
    borderRightColor: colors.surfaceContainerHigh,
  },
  generatingSlotContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  generatingSlotIcon: {
    opacity: 0.6,
  },
  generatingSlotTag: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  generatingSlotTagText: {
    color: colors.outline,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  generatingFooter: {
    padding: spacing.gutter,
    gap: spacing.stackSm,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
  },
  stepIcon: {
    opacity: 0.85,
  },
  stepText: {
    fontFamily: 'Inter_500Medium',
    color: colors.onSurface,
    flex: 1,
  },
  progressBarBackground: {
    marginTop: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  generatingCaption: {
    marginTop: 2,
    fontSize: 11,
  },
  errorContainer: {
    padding: spacing.gutter,
    alignItems: 'center',
  },
  errorIconCircle: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.goldAccentLight || 'rgba(201,168,76,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.stackMd,
  },
  errorTitle: {
    textAlign: 'center',
    marginBottom: spacing.stackSm,
    fontFamily: 'Inter_600SemiBold',
  },
  errorDescription: {
    textAlign: 'center',
    marginBottom: spacing.stackLg,
    maxWidth: 280,
    lineHeight: 20,
  },
  retryButton: {
    minWidth: 160,
  },
});

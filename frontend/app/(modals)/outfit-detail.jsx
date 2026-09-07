// app/(modals)/outfit-detail.jsx
//
// Backed by GET /api/outfits/:outfitId (outfitService.getOutfitById) -
// full Outfit doc, items populated with everything except the embedding
// vector.
//
// UPDATE: the backend gap described below has been FIXED —
// compatibilityScorer now actually computes per-category scores (see
// backend-fixes/services/recommendation/compatibilityScorer.js), so
// Outfit.scoreBreakdown is real for any outfit created after that fix is
// applied. This screen now renders it via <OutfitScore>. Outfits created
// BEFORE the fix will still have an empty scoreBreakdown — OutfitScore
// handles that gracefully by rendering nothing rather than empty bars.
//
// Also new: fetches the outfit's Recommendation document (backend fix #2
// — this route didn't exist before) and shows the real
// algorithm/personalization/freshness breakdown via the same
// <ScoreBreakdown> component the Stylist chat uses — reused, not
// duplicated. This is `null` for outfits that were user-created rather
// than AI-suggested, which is expected, not an error.

import React, { useState } from 'react';
import { View, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Screen from '@/components/common/Screen';
import Text from '@/components/common/Text';
import Button from '@/components/common/Button';
import Tag from '@/components/common/Tag';
import Modal from '@/components/common/Modal';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorState from '@/components/common/ErrorState';
import OutfitScore from '@/components/outfit/OutfitScore';
import ScoreBreakdown from '@/components/chat/ScoreBreakdown';
import { useOutfit, useOutfitAction, useDeleteOutfit, useOutfitRecommendation } from '@/hooks/useOutfits';
import { useUIStore } from '@/stores';
import { daysSince } from '@/utils/dateUtils';
import { colors, spacing, radius } from '@/theme';

export default function OutfitDetailModal() {
  const { outfitId } = useLocalSearchParams();
  const router = useRouter();
  const showToast = useUIStore((s) => s.showToast);

  const { data: outfit, isLoading, isError, refetch } = useOutfit(outfitId);
  const { data: recommendation } = useOutfitRecommendation(outfitId);
  const outfitAction = useOutfitAction();
  const deleteOutfit = useDeleteOutfit();
  const [actionLoading, setActionLoading] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (isError || !outfit) return <ErrorState onRetry={refetch} />;

  // Map Recommendation.scores {final, compatibility, personalization,
  // novelty} onto the shape <ScoreBreakdown> already expects {total,
  // algorithm, personalization, noveltyPenalty} — same component, no
  // duplication, just a field-name translation between two collections
  // that independently chose slightly different naming.
  const rankingScore = recommendation?.scores
    ? {
      total: recommendation.scores.final,
      algorithm: recommendation.scores.compatibility,
      personalization: recommendation.scores.personalization,
      noveltyPenalty: recommendation.scores.novelty,
    }
    : null;

  const handleSaveToggle = () => {
    setActionLoading('save');
    if (outfit.isSaved) {
      deleteOutfit.mutate(outfitId, {
        onSuccess: () => {
          showToast('Removed from saved', 'success');
          router.back();
        },
        onError: () => showToast('Could not remove this outfit', 'error'),
        onSettled: () => setActionLoading(null),
      });
    } else {
      // No recommendationId available here (this screen can be reached from
      // Wear History / Planner, not just a fresh suggestion) - the backend
      // treats it as optional and still runs the full learning pipeline,
      // it just skips creating a RecommendationEvent (see
      // outfitService.recordOutfitAction).
      outfitAction.mutate(
        { outfitId, action: 'saved' },
        {
          onSuccess: () => {
            showToast('Outfit saved', 'success');
            refetch();
          },
          onError: () => showToast('Could not save this outfit', 'error'),
          onSettled: () => setActionLoading(null),
        }
      );
    }
  };

  const handleMarkWorn = () => {
    setActionLoading('worn');
    outfitAction.mutate(
      { outfitId, action: 'worn' },
      {
        onSuccess: () => {
          showToast('Marked as worn', 'success');
          refetch();
        },
        onError: () => showToast('Could not update this outfit', 'error'),
        onSettled: () => setActionLoading(null),
      }
    );
  };

  const handleDeletePermanent = () => {
    setActionLoading('deletePermanent');
    deleteOutfit.mutate(
      { outfitId, permanent: true },
      {
        onSuccess: () => {
          showToast('Outfit permanently deleted', 'success');
          setDeleteConfirmOpen(false);
          router.back();
        },
        onError: () => {
          showToast('Could not delete outfit', 'error');
        },
        onSettled: () => setActionLoading(null),
      }
    );
  };

  const daysAgo = daysSince(outfit.lastWornAt);

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Close">
          <MaterialCommunityIcons name="close" size={24} color={colors.primary} />
        </Pressable>
        <Text variant="titleMd">Outfit Detail</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itemsRow}>
        {outfit.items.map((item, i) => {
          const cloth = item.clothId;
          return (
            <Pressable
              key={cloth?._id || i}
              style={styles.itemThumb}
              onPress={() => cloth?._id && router.push(`/(app)/wardrobe/${cloth._id}`)}
            >
              <Image source={{ uri: cloth?.imageUrl }} style={styles.itemImage} contentFit="contain" />
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.content}>
        <Text variant="displayLg">{outfit.outfitName}</Text>

        <View style={styles.tagsRow}>
          {outfit.vibe && <Tag label={outfit.vibe} variant="static" />}
          {outfit.occasion && <Tag label={outfit.occasion} variant="static" style={styles.tagSpacing} />}
          {outfit.formality && <Tag label={outfit.formality} variant="static" style={styles.tagSpacing} />}
        </View>

        {outfit.compatibilityScore != null && (
          <View style={styles.scoreCard}>
            <Text variant="labelCaps" color="secondary">Compatibility Score</Text>
            <Text variant="displayMd" style={styles.scoreValue}>{outfit.compatibilityScore}/100</Text>
          </View>
        )}

        <OutfitScore scoreBreakdown={outfit.scoreBreakdown} />

        {rankingScore && (
          <View style={styles.rankingScoreCard}>
            <ScoreBreakdown score={rankingScore} />
          </View>
        )}

        {outfit.whyItWorks && (
          <View style={styles.textBlock}>
            <Text variant="titleSm">Why It Works</Text>
            <Text variant="bodyLg" color="secondary" style={styles.textBody}>{outfit.whyItWorks}</Text>
          </View>
        )}

        {outfit.stylingTip && (
          <View style={styles.textBlock}>
            <Text variant="titleSm">Styling Tip</Text>
            <Text variant="bodyLg" color="secondary" style={styles.textBody}>{outfit.stylingTip}</Text>
          </View>
        )}

        <View style={styles.metaRow}>
          <Text variant="bodyMd" color="secondary">
            Worn {outfit.wearCount || 0} time{outfit.wearCount === 1 ? '' : 's'}
            {daysAgo != null ? ` · last worn ${daysAgo}d ago` : ''}
          </Text>
        </View>

        <View style={styles.itemListSection}>
          <Text variant="headlineSm" style={styles.sectionTitle}>Items in this outfit</Text>
          {outfit.items.map((item, i) => {
            const cloth = item.clothId;
            if (!cloth) return null;
            return (
              <Pressable
                key={cloth._id}
                style={styles.itemRow}
                onPress={() => router.push(`/(app)/wardrobe/${cloth._id}`)}
              >
                <Image source={{ uri: cloth.imageUrl }} style={styles.itemRowImage} contentFit="contain" />
                <View style={styles.itemRowInfo}>
                  <Text variant="bodyLg" numberOfLines={1}>{cloth.subCategory || cloth.category}</Text>
                  <Text variant="bodyMd" color="secondary">
                    {cloth.color?.primary} · {cloth.formality}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color={colors.secondary} />
              </Pressable>
            );
          })}
        </View>

        <View style={styles.actionsRow}>
          <Button onPress={handleMarkWorn} loading={actionLoading === 'worn'} style={styles.actionFlex}>
            Mark as Worn
          </Button>
          <Button
            variant="secondary"
            onPress={handleSaveToggle}
            loading={actionLoading === 'save'}
            style={styles.actionFlex}
          >
            {outfit.isSaved ? 'Remove Saved' : 'Save'}
          </Button>
        </View>

        <Button
          variant="secondary"
          icon="trash-can-outline"
          onPress={() => setDeleteConfirmOpen(true)}
          style={styles.deleteButton}
          textStyle={styles.deleteButtonText}
        >
          Delete Item Permanently
        </Button>

        <Modal visible={deleteConfirmOpen} onRequestClose={() => setDeleteConfirmOpen(false)}>
          <Text variant="titleMd">Delete permanently?</Text>
          <Text variant="bodyMd" color="secondary" style={styles.modalDescription}>
            This will permanently delete this outfit from your saved collection. This action cannot be undone.
          </Text>
          <View style={styles.modalActions}>
            <Button
              variant="secondary"
              onPress={() => setDeleteConfirmOpen(false)}
              style={styles.modalButton}
              fullWidth={false}
            >
              Cancel
            </Button>
            <Button
              onPress={handleDeletePermanent}
              loading={actionLoading === 'deletePermanent'}
              style={[styles.modalButton, { backgroundColor: colors.error }]}
              fullWidth={false}
            >
              Delete
            </Button>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.stackSm,
  },
  itemsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    marginTop: spacing.stackMd,
  },
  itemThumb: { width: 110, height: 130, padding: 10 },
  itemImage: { width: '100%', height: '100%' },
  content: { paddingTop: spacing.stackLg },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.stackSm, marginBottom: spacing.stackLg },
  tagSpacing: { marginLeft: spacing.stackSm },
  scoreCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: spacing.stackMd,
    marginBottom: spacing.stackLg,
  },
  scoreValue: { marginTop: 4 },
  rankingScoreCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    padding: spacing.stackMd,
    marginBottom: spacing.stackLg,
  },
  textBlock: { marginBottom: spacing.stackLg },
  textBody: { marginTop: spacing.stackSm },
  metaRow: { marginBottom: spacing.stackLg },
  itemListSection: {
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerHigh,
    paddingTop: spacing.stackLg,
    marginBottom: spacing.stackLg,
  },
  sectionTitle: { marginBottom: spacing.stackMd },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.stackSm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHigh,
  },
  itemRowImage: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceContainerLow,
    marginRight: spacing.stackMd,
  },
  itemRowInfo: { flex: 1 },
  actionsRow: { flexDirection: 'row', gap: spacing.stackSm, marginBottom: spacing.stackMd },
  actionFlex: { flex: 1 },
  deleteButton: {
    marginBottom: spacing.stackXl,
    borderColor: colors.error,
  },
  deleteButtonText: {
    color: colors.error,
  },
  modalDescription: {
    marginTop: spacing.stackSm,
    marginBottom: spacing.stackLg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.inlineMd,
  },
  modalButton: {
    flex: 1,
  },
});
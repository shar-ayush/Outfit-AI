// app/(app)/wardrobe/[clothId].jsx
//
// Matches item_detail/code.html: overlay header (back + more), hero image,
// color+name header, tag chips, stats bento grid, action row, attributes
// list, wear history.
//
// DEVIATIONS FROM THE MOCK (both intentional — see comments below):
//  1. "Log Wear" / "Plan" buttons are replaced with "Toggle Availability" /
//     "Edit" / "Archive" — the backend's WearLog model requires an outfitId,
//     there's no endpoint to log a single item as worn independent of an
//     outfit, so a "Log Wear" button here would call an API that doesn't
//     exist. Toggle/Edit/Archive all map to real endpoints.
//  2. The mock's "AI STYLIST NOTE" is fabricated flavor text with no real
//     backing data. Replaced with a genuinely-real AI badge showing the
//     item's actual aiConfidence score.
//  3. "Wear History" is derived by fetching recent wear logs and filtering
//     client-side for entries containing this clothId — the backend has no
//     per-item wear-history endpoint.

import React, { useState } from 'react';
import { View, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Text from '@/components/common/Text';
import Tag from '@/components/common/Tag';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorState from '@/components/common/ErrorState';
import Modal from '@/components/common/Modal';
import ClothStats from '@/components/cloth/ClothStats';
import { useClothItem, useToggleAvailability, useArchiveCloth, useDeleteClothPermanent } from '@/hooks/useWardrobe';
import { useItemWearHistory } from '@/hooks/useWearLogs';
import { useUIStore } from '@/stores';
import { COLOR_HEX_MAP, getClothColorHex } from '@/constants/categories';
import { colors, spacing, radius } from '@/theme';




const ATTRIBUTE_ROWS = [
  { key: 'fabric', label: 'Fabric' },
  { key: 'fit', label: 'Fit' },
  { key: 'pattern', label: 'Pattern' },
];

export default function ItemDetailScreen() {
  const { clothId } = useLocalSearchParams();
  const router = useRouter();
  const showToast = useUIStore((s) => s.showToast);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);

  const { data: cloth, isLoading, isError, refetch } = useClothItem(clothId);
  const toggleAvailability = useToggleAvailability();
  const archiveCloth = useArchiveCloth();
  const deleteClothPermanent = useDeleteClothPermanent();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  // FIX (backend #6): now uses the real clothId filter on GET /wear-logs
  // instead of fetching 50 general logs and filtering client-side (which
  // silently missed older wears once a user had 50+ logs total).
  const { data: itemWearHistoryData } = useItemWearHistory(clothId, 5);
  const itemWearLogs = itemWearHistoryData?.logs || [];

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (isError || !cloth) return <ErrorState onRetry={refetch} />;

  const handleToggleAvailability = () => {
    toggleAvailability.mutate(clothId, {
      onSuccess: (result) =>
        showToast(result.isAvailable ? 'Marked as available' : 'Marked as in laundry', 'success'),
      onError: () => showToast('Could not update availability', 'error'),
    });
  };

  const handleArchive = () => {
    archiveCloth.mutate(clothId, {
      onSuccess: () => {
        showToast('Item archived', 'success');
        router.back();
      },
      onError: () => showToast('Could not archive this item', 'error'),
    });
  };

  const handleDeletePermanent = () => {
    deleteClothPermanent.mutate(clothId, {
      onSuccess: () => {
        showToast('Item permanently deleted', 'success');
        router.back();
      },
      onError: () => showToast('Could not delete this item', 'error'),
    });
  };

  return (
    <View style={styles.root}>
      <View style={styles.overlayHeader}>
        <Pressable style={styles.overlayButton} onPress={() => router.back()} accessibilityLabel="Go back">
          <MaterialCommunityIcons name="arrow-left" size={20} color="#FFFFFF" />
        </Pressable>
        <Pressable
          style={styles.overlayButton}
          onPress={() => router.push({ pathname: '/(modals)/item-edit', params: { clothId } })}
          accessibilityLabel="Edit item"
        >
          <MaterialCommunityIcons name="pencil-outline" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrap}>
          <Image source={{ uri: cloth.imageUrl }} style={styles.heroImage} contentFit="cover" />
        </View>

        <View style={styles.content}>
          <View style={styles.colorRow}>
            {(() => {
              const colorDotHex = getClothColorHex(cloth.color, colors.surfaceContainerHigh);

              const isLightColor =
                colorDotHex?.toLowerCase() === '#ffffff' ||
                colorDotHex?.toLowerCase() === '#fff' ||
                colorDotHex?.toLowerCase() === '#fffdd0' ||
                colorDotHex?.toLowerCase() === '#f5f5dc';

              return (
                <View
                  style={[
                    styles.colorDot,
                    { backgroundColor: colorDotHex },
                    isLightColor && {
                      borderColor: colors.outlineVariant,
                      borderWidth: 1,
                    },
                  ]}
                />
              );
            })()}
            <Text variant="bodyMd" color="secondary" style={styles.colorLabel}>
              {cloth.color?.primary?.toUpperCase()}
            </Text>
          </View>



          <Text variant="displayLg">
            {cloth.name || `${cloth.subCategory || cloth.category}`}
          </Text>

          {/* Deduplicated Style & Formality Tags */}
          {(() => {
            const displayTags = [cloth.formality, ...(cloth.style || [])]
              .filter(Boolean)
              .reduce((acc, tag) => {
                const trimmed = tag.trim();
                if (!acc.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) {
                  acc.push(trimmed);
                }
                return acc;
              }, []);

            return displayTags.length > 0 ? (
              <View style={styles.tagsRow}>
                {displayTags.map((tag) => (
                  <Tag key={tag} label={tag} variant="static" />
                ))}
              </View>
            ) : null;
          })()}


          

          <View style={styles.actionsRow}>
            <Button
              variant="primary"
              icon="creation"
              onPress={() =>
                router.push({
                  pathname: '/(modals)/try-on',
                  params: { clothId: cloth._id },
                })
              }
              style={styles.actionFlex}
            >
              Virtual Try-On
            </Button>
            <Button
              variant="secondary"
              icon="trash-can-outline"
              size="icon"
              onPress={() => setDeleteConfirmOpen(true)}
              fullWidth={false}
            />
          </View>


          <View style={styles.attributesSection}>
            <Text variant="headlineSm" style={styles.sectionTitle}>Attributes</Text>
            {ATTRIBUTE_ROWS.map(
              (row) =>
                cloth[row.key] && (
                  <View key={row.key} style={styles.attributeRow}>
                    <Text variant="bodyLg" color="secondary">{row.label}</Text>
                    <Text variant="bodyLg" style={styles.attributeValue}>
                      {cloth[row.key]}
                    </Text>
                  </View>
                )
            )}
            {cloth.occasions?.length > 0 && (
              <View style={styles.attributeRow}>
                <Text variant="bodyLg" color="secondary">Occasions</Text>
                <Text variant="bodyLg" style={styles.attributeValue}>
                  {cloth.occasions.join(', ')}
                </Text>
              </View>
            )}
            {cloth.season?.length > 0 && (
              <View style={styles.attributeRow}>
                <Text variant="bodyLg" color="secondary">Season</Text>
                <Text variant="bodyLg" style={styles.attributeValue}>
                  {cloth.season.join(', ')}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.statsSection}>
            <ClothStats cloth={cloth} />
          </View>

          {cloth.aiTagged && (
            <View style={styles.aiBadge}>
              <MaterialCommunityIcons name="creation" size={18} color={colors.goldAccent} />
              <View style={styles.aiBadgeTextWrap}>
                <Text variant="labelCaps" color="secondary">AI TAGGED</Text>
                <Text variant="bodyMd" style={styles.aiBadgeText}>
                  Metadata extracted automatically with {Math.round((cloth.aiConfidence || 0) * 100)}%
                  confidence.
                </Text>
              </View>
            </View>
          )}

          {itemWearLogs.length > 0 && (
            <View style={styles.historySection}>
              <Text variant="headlineSm" style={styles.sectionTitle}>Wear History</Text>
              {itemWearLogs.map((log) => (
                <View key={log._id} style={styles.historyRow}>
                  <View style={styles.historyThumb} />
                  <View style={styles.historyInfo}>
                    <Text variant="titleSm">{log.context?.occasion || 'Worn'}</Text>
                    <Text variant="bodyMd" color="secondary">{formatRelativeDate(log.wornAt)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={archiveConfirmOpen} onRequestClose={() => setArchiveConfirmOpen(false)}>
        <Text variant="titleMd">Archive this item?</Text>
        <Text variant="bodyMd" color="secondary" style={styles.modalDescription}>
          It'll be removed from your wardrobe and outfit suggestions, but you can restore it later.
        </Text>
        <View style={styles.modalActions}>
          <Button
            variant="secondary"
            onPress={() => setArchiveConfirmOpen(false)}
            style={styles.modalButton}
            fullWidth={false}
          >
            Cancel
          </Button>
          <Button
            onPress={handleArchive}
            loading={archiveCloth.isPending}
            style={styles.modalButton}
            fullWidth={false}
          >
            Archive
          </Button>
        </View>
      </Modal>

      <Modal visible={deleteConfirmOpen} onRequestClose={() => setDeleteConfirmOpen(false)}>
        <Text variant="titleMd">Delete permanently?</Text>
        <Text variant="bodyMd" color="secondary" style={styles.modalDescription}>
          This will permanently delete this item and its photos from your wardrobe. This action cannot be undone.
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
            loading={deleteClothPermanent.isPending}
            style={[styles.modalButton, { backgroundColor: colors.error }]}
            fullWidth={false}
          >
            Delete
          </Button>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceContainerLowest },
  overlayHeader: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter,
  },
  overlayButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroWrap: { width: '100%', height: 420, backgroundColor: colors.surfaceContainerHighest },
  heroImage: { width: '100%', height: '100%' },
  content: { padding: spacing.gutter },
  colorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.stackSm },
  colorDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.outlineVariant },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.inlineSm,
    marginTop: spacing.stackSm,
    marginBottom: spacing.stackLg,
  },

  statsSection: { marginBottom: spacing.stackLg },
  actionsRow: { flexDirection: 'row', gap: spacing.stackSm, marginBottom: spacing.stackLg },
  actionFlex: { flex: 1 },
  attributesSection: {
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerHigh,
    paddingTop: spacing.stackLg,
    marginBottom: spacing.stackLg,
  },
  sectionTitle: { marginBottom: spacing.stackMd },
  attributeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.stackSm,
    marginBottom: spacing.stackSm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHigh,
  },
  attributeValue: { fontFamily: 'Inter_600SemiBold', textTransform: 'capitalize' },
  aiBadge: {
    flexDirection: 'row',
    backgroundColor: colors.goldAccentLight,
    borderRadius: radius.lg,
    padding: spacing.stackMd,
    marginBottom: spacing.stackLg,
  },
  aiBadgeTextWrap: { flex: 1, marginLeft: spacing.stackSm },
  aiBadgeText: { color: colors.onTertiaryContainer, marginTop: 2 },
  historySection: {
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerHigh,
    paddingTop: spacing.stackLg,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.stackSm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHigh,
  },
  historyThumb: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceContainerHigh,
    marginRight: spacing.stackMd,
  },
  historyInfo: { flex: 1 },
  modalDescription: { marginTop: spacing.stackSm, marginBottom: spacing.stackLg },
  modalActions: { flexDirection: 'row', gap: spacing.stackSm },
  modalButton: { flex: 1 },
});
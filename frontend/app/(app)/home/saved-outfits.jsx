// app/(app)/home/saved-outfits.jsx
//
// Dedicated Saved Outfits screen accessed from Home Quick Actions.
// Backed by real GET /api/outfits/saved and DELETE /api/outfits/:outfitId.

import React, { useState } from 'react';
import { View, Pressable, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Screen from '@/components/common/Screen';
import Text from '@/components/common/Text';
import Card from '@/components/common/Card';
import Tag from '@/components/common/Tag';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useSavedOutfits, useOutfitAction, useDeleteOutfit } from '@/hooks/useOutfits';
import { useUIStore } from '@/stores';
import { colors, spacing, radius } from '@/theme';

export default function SavedOutfitsScreen() {
  const router = useRouter();
  const showToast = useUIStore((s) => s.showToast);

  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching, refetch } = useSavedOutfits(page);
  const outfitAction = useOutfitAction();
  const deleteOutfit = useDeleteOutfit();

  const [actionLoading, setActionLoading] = useState({});
  const [deleteConfirmOutfitId, setDeleteConfirmOutfitId] = useState(null);

  const outfits = data?.outfits || [];
  const total = data?.pagination?.total ?? outfits.length;

  const handleOpenDetail = (outfitId) => {
    if (!outfitId) return;
    router.push({
      pathname: '/(modals)/outfit-detail',
      params: { outfitId },
    });
  };

  const handleMarkWorn = (outfitId) => {
    if (!outfitId) return;
    setActionLoading((prev) => ({ ...prev, [outfitId]: 'worn' }));
    outfitAction.mutate(
      { outfitId, action: 'worn' },
      {
        onSuccess: () => {
          showToast('Marked as worn today', 'success');
        },
        onError: () => {
          showToast('Could not record outfit as worn', 'error');
        },
        onSettled: () => {
          setActionLoading((prev) => {
            const next = { ...prev };
            delete next[outfitId];
            return next;
          });
        },
      }
    );
  };

  const handleConfirmPermanentDelete = () => {
    if (!deleteConfirmOutfitId) return;
    const targetId = deleteConfirmOutfitId;
    setActionLoading((prev) => ({ ...prev, [targetId]: 'remove' }));
    deleteOutfit.mutate(
      { outfitId: targetId, permanent: true },
      {
        onSuccess: () => {
          showToast('Outfit permanently deleted', 'success');
          setDeleteConfirmOutfitId(null);
        },
        onError: () => {
          showToast('Could not delete outfit', 'error');
        },
        onSettled: () => {
          setActionLoading((prev) => {
            const next = { ...prev };
            delete next[targetId];
            return next;
          });
        },
      }
    );
  };

  const renderOutfitItem = ({ item }) => {
    const outfitId = (item._id || item.outfitId)?.toString();
    const items = Array.isArray(item.items) ? item.items : [];
    const isLoadingWorn = actionLoading[outfitId] === 'worn';
    const isLoadingRemove = actionLoading[outfitId] === 'remove';

    return (
      <Card noPadding elevated style={styles.card}>
        <Pressable
          onPress={() => handleOpenDetail(outfitId)}
          android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
        >
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleWrap}>
              <Text variant="titleSm" style={styles.outfitName} numberOfLines={1}>
                {item.outfitName || 'Saved Look'}
              </Text>
              <Text variant="caption" color="secondary">
                {items.length} {items.length === 1 ? 'piece' : 'pieces'}
              </Text>
            </View>
            <View style={styles.badgeRow}>
              {item.vibe && <Tag label={item.vibe} variant="static" />}
              {item.occasion && (
                <Tag label={item.occasion} variant="outline" style={styles.badgeSpacing} />
              )}
            </View>
          </View>

          {/* Clothes Grid / Strip */}
          <View style={styles.itemsStrip}>
            {items.map((it, idx) => {
              const cloth = it?.clothId && typeof it.clothId === 'object' ? it.clothId : it;
              const imageUrl = cloth?.imageUrl || it?.imageUrl;
              const category = cloth?.category || it?.role || 'Item';
              const key = cloth?._id || `piece-${idx}`;

              return (
                <View
                  key={key}
                  style={[
                    styles.itemThumb,
                    idx < items.length - 1 && styles.itemThumbBorder,
                  ]}
                >
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.itemImage} contentFit="contain" />
                  ) : (
                    <View style={styles.placeholderImage} />
                  )}
                  <View style={styles.categoryChip}>
                    <Text variant="labelCaps" style={styles.categoryChipText}>
                      {category}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Why it works snippet */}
          {item.whyItWorks && (
            <View style={styles.noteSection}>
              <Text variant="bodyMd" color="secondary" numberOfLines={2}>
                <Text variant="labelMd">Why it works: </Text>
                {item.whyItWorks}
              </Text>
            </View>
          )}

          {/* Card Actions */}
          <View style={styles.cardFooter}>
            <Button
              size="sm"
              loading={isLoadingWorn}
              onPress={() => handleMarkWorn(outfitId)}
              style={styles.actionBtn}
              fullWidth={false}
            >
              Wear Today
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onPress={() => handleOpenDetail(outfitId)}
              style={styles.actionBtn}
              fullWidth={false}
            >
              Details
            </Button>
            <Pressable
              style={styles.deleteIconBtn}
              onPress={() => setDeleteConfirmOutfitId(outfitId)}
              disabled={isLoadingRemove}
              hitSlop={8}
              accessibilityLabel="Delete outfit permanently"
            >
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={22}
                color={colors.error}
              />
            </Pressable>
          </View>
        </Pressable>
      </Card>
    );
  };

  return (
    <Screen edges={['top', 'bottom']} padded={false}>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.onSurface} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text variant="titleMd">Saved Outfits</Text>
          <Text variant="caption" color="secondary">
            {total} {total === 1 ? 'outfit' : 'outfits'} in collection
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Main Content */}
      {isLoading && outfits.length === 0 ? (
        <LoadingSpinner fullScreen />
      ) : outfits.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="bookmark-outline"
            title="No saved outfits yet"
            description="Save outfits from your daily recommendation or style chat to build your favorite looks collection."
            actionLabel="Style Chat"
            onAction={() => router.push('/(app)/stylist')}
          />
        </View>
      ) : (
        <FlatList
          data={outfits}
          keyExtractor={(item, index) => item._id?.toString() || `outfit-${index}`}
          renderItem={renderOutfitItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
        />
      )}

      <Modal visible={!!deleteConfirmOutfitId} onRequestClose={() => setDeleteConfirmOutfitId(null)}>
        <Text variant="titleMd">Delete permanently?</Text>
        <Text variant="bodyMd" color="secondary" style={styles.modalDescription}>
          This will permanently delete this outfit from your saved collection. This action cannot be undone.
        </Text>
        <View style={styles.modalActions}>
          <Button
            variant="secondary"
            onPress={() => setDeleteConfirmOutfitId(null)}
            style={styles.modalButton}
            fullWidth={false}
          >
            Cancel
          </Button>
          <Button
            onPress={handleConfirmPermanentDelete}
            loading={!!(deleteConfirmOutfitId && actionLoading[deleteConfirmOutfitId])}
            style={[styles.modalButton, { backgroundColor: colors.error }]}
            fullWidth={false}
          >
            Delete
          </Button>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.stackSm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHigh,
    backgroundColor: colors.background,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  listContainer: {
    padding: spacing.gutter,
    gap: spacing.stackMd,
    paddingBottom: spacing.stackXl,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.gutter,
  },
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.stackMd,
    paddingBottom: spacing.stackSm,
  },
  cardTitleWrap: {
    flex: 1,
    marginRight: spacing.stackSm,
  },
  outfitName: {
    fontFamily: 'Inter_600SemiBold',
    color: colors.onSurface,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeSpacing: {
    marginLeft: spacing.stackXs,
  },
  itemsStrip: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.surfaceContainerHigh,
  },
  itemThumb: {
    flex: 1,
    aspectRatio: 3 / 4,
    backgroundColor: colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  itemThumbBorder: {
    borderRightWidth: 1,
    borderRightColor: colors.surfaceContainerHigh,
  },
  itemImage: {
    width: '100%',
    height: '100%',
    padding: 8,
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surfaceContainerHigh,
  },
  categoryChip: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(249,249,249,0.85)',
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  categoryChipText: {
    fontSize: 8,
    textTransform: 'uppercase',
    color: colors.onSurface,
  },
  noteSection: {
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.stackSm,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.stackSm,
    gap: spacing.stackSm,
  },
  actionBtn: {
    flex: 1,
  },
  deleteIconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.stackXs,
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

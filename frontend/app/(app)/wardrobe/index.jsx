import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Screen from '@/components/common/Screen';
import Text from '@/components/common/Text';
import Input from '@/components/common/Input';
import Tag from '@/components/common/Tag';
import EmptyState from '@/components/common/EmptyState';
import ErrorState from '@/components/common/ErrorState';
import { SkeletonCard } from '@/components/common/SkeletonLoader';
import BottomSheet, { SheetOption } from '@/components/common/BottomSheet';
import ClothCard from '@/components/cloth/ClothCard';
import { useWardrobeList } from '@/hooks/useWardrobe';
import { useWardrobeStore } from '@/stores';
import { CLOTH_CATEGORIES, FORMALITY_FILTERS } from '@/constants/categories';
import { colors, spacing, radius, shadows } from '@/theme';

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Most Recent' },
  { value: 'mostWorn', label: 'Most Worn', order: 'desc' },
  { value: 'mostWorn', label: 'Least Worn', order: 'asc', key: 'leastWorn' },
  { value: 'name', label: 'Name A-Z', order: 'asc' },
  { value: 'purchasePrice', label: 'Price High-Low', order: 'desc' },
];

export default function WardrobeGridScreen() {
  const router = useRouter();
  const filters = useWardrobeStore((s) => s.filters);
  const setFilters = useWardrobeStore((s) => s.setFilters);
  const sort = useWardrobeStore((s) => s.sort);
  const setSort = useWardrobeStore((s) => s.setSort);
  const offlineItems = useWardrobeStore((s) => s.items);
  const isOffline = useWardrobeStore((s) => s.isOffline);
  const setCachedItems = useWardrobeStore((s) => s.setItems);
  const loadOfflineCache = useWardrobeStore((s) => s.loadOfflineCache);

  const [searchOpen, setSearchOpen] = useState(false);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.search || '');

  const searchTimeout = React.useRef(null);
  const handleSearchChange = (text) => {
    setSearchInput(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setFilters({ search: text }), 400);
  };

  const queryFilters = useMemo(
    () => ({
      category: filters.category,
      formality: filters.formality,
      search: filters.search || undefined,
    }),
    [filters]
  );

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
  } = useWardrobeList(queryFilters, sort);

  const items = useMemo(() => data?.pages.flatMap((p) => p.clothes) || [], [data]);

  useEffect(() => {
    if (items.length > 0 && !filters.category && !filters.formality && !filters.search) {
      setCachedItems(items);
    }
  }, [items]);

  useEffect(() => {
    if (isError) loadOfflineCache();
  }, [isError]);

  const displayItems = isError && offlineItems.length > 0 ? offlineItems : items;

  const renderItem = useCallback(
    ({ item }) => (
      <View style={styles.gridItemWrap}>
        <ClothCard cloth={item} onPress={() => router.push(`/(app)/wardrobe/${item._id}`)} />
      </View>
    ),
    []
  );

  return (
    <Screen edges={['top']} padded={false}>
      <View style={styles.stickyHeader}>
        <View style={styles.titleRow}>
          <Text variant="titleMd">My Collection</Text>
          <View style={styles.headerIcons}>
            <Pressable style={styles.iconButton} onPress={() => setSearchOpen((v) => !v)}>
              <MaterialCommunityIcons name="magnify" size={20} color={colors.onSurface} />
            </Pressable>
            <Pressable style={styles.iconButton} onPress={() => setSortSheetOpen(true)}>
              <MaterialCommunityIcons name="sort" size={20} color={colors.onSurface} />
            </Pressable>
          </View>
        </View>

        {searchOpen && (
          <View style={styles.searchWrap}>
            <Input
              variant="outlined"
              placeholder="Search by name, brand, color..."
              value={searchInput}
              onChangeText={handleSearchChange}
              icon="magnify"
              containerStyle={styles.searchInput}
            />
          </View>
        )}

        <View style={styles.filterRowWrap}>
          {CLOTH_CATEGORIES.map((cat) => (
            <Tag
              key={cat.label}
              label={cat.label}
              active={filters.category === cat.value}
              onPress={() => setFilters({ category: cat.value })}
              style={styles.filterChip}
            />
          ))}
        </View>

        <View style={styles.filterRowWrap}>
          {FORMALITY_FILTERS.map((f) => (
            <Tag
              key={f.label}
              label={f.label}
              variant={filters.formality === f.value ? 'solid' : 'outline'}
              active={filters.formality === f.value}
              onPress={() => setFilters({ formality: f.value })}
              style={styles.filterChip}
            />
          ))}
        </View>
      </View>

      {isOffline && (
        <View style={styles.offlineBanner}>
          <MaterialCommunityIcons name="wifi-off" size={14} color={colors.secondary} />
          <Text variant="caption" color="secondary" style={styles.offlineBannerText}>
            You're offline — showing your last synced wardrobe
          </Text>
        </View>
      )}

      {isError && displayItems.length === 0 ? (
        <ErrorState onRetry={refetch} />
      ) : isLoading ? (
        <View style={styles.skeletonGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={styles.gridItemWrap}>
              <SkeletonCard />
            </View>
          ))}
        </View>
      ) : displayItems.length === 0 ? (
        <EmptyState
          icon="hanger"
          title="Your wardrobe is empty"
          description="Add your first item to start getting AI-powered outfit suggestions."
          actionLabel="Add Your First Item"
          onAction={() => setUploadSheetOpen(true)}
        />
      ) : (
        <FlashList
          data={displayItems}
          renderItem={renderItem}
          numColumns={2}
          estimatedItemSize={260}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          onEndReached={() => !isOffline && hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.4}
          refreshing={isLoading}
          onRefresh={refetch}
        />
      )}

      <Pressable style={[styles.fab, shadows.lg]} onPress={() => setUploadSheetOpen(true)}>
        <MaterialCommunityIcons name="plus" size={26} color={colors.onPrimary} />
      </Pressable>

      <BottomSheet visible={uploadSheetOpen} onClose={() => setUploadSheetOpen(false)} title="Add to Wardrobe">
        <SheetOption
          icon="camera-outline"
          label="Add Single Item"
          onPress={() => {
            setUploadSheetOpen(false);
            router.push('/(app)/wardrobe/upload');
          }}
        />
        <SheetOption
          icon="image-multiple-outline"
          label="Add Multiple Items"
          onPress={() => {
            setUploadSheetOpen(false);
            router.push('/(app)/wardrobe/bulk-upload');
          }}
        />
      </BottomSheet>

      <BottomSheet visible={sortSheetOpen} onClose={() => setSortSheetOpen(false)} title="Sort By">
        {SORT_OPTIONS.map((option) => (
          <SheetOption
            key={option.key || option.value + option.label}
            icon={sort === (option.key || option.value) ? 'check-circle' : 'circle-outline'}
            label={option.label}
            onPress={() => {
              setSort(option.key || option.value);
              setSortSheetOpen(false);
            }}
          />
        ))}
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stickyHeader: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceVariant,
    paddingTop: spacing.stackSm,
    paddingBottom: spacing.stackSm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter,
    marginBottom: spacing.stackSm,
  },
  headerIcons: { flexDirection: 'row', gap: spacing.stackSm },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: { paddingHorizontal: spacing.gutter, marginBottom: spacing.stackSm },
  searchInput: { marginBottom: 0 },
  filterRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.gutter,
    gap: spacing.stackSm,
    marginBottom: spacing.stackSm,
  },
  filterChip: { marginBottom: 0 },
  listContent: { padding: spacing.gutter },
  gridItemWrap: { flex: 1, padding: spacing.stackSm },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.gutter },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    backgroundColor: colors.surfaceContainer,
  },
  offlineBannerText: { marginLeft: 6 },
  fab: {
    position: 'absolute',
    right: spacing.containerPadding,
    bottom: spacing.stackLg,
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
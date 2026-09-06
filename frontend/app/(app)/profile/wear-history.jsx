// app/(app)/profile/wear-history.jsx
//
// Backed by GET /api/wear-logs (paginated). Grouped by month client-side
// since the backend returns a flat, date-sorted list (no grouping param).
// Uses SectionList's built-in sticky headers rather than a manual
// scroll-position calculation.

import React, { useMemo, useState, useEffect } from 'react';
import { View, Pressable, SectionList, RefreshControl, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Screen from '@/components/common/Screen';
import Text from '@/components/common/Text';
import Tag from '@/components/common/Tag';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorState from '@/components/common/ErrorState';
import EmptyState from '@/components/common/EmptyState';
import OutfitItemsRow from '@/components/outfit/OutfitItemsRow';
import { useWearHistory } from '@/hooks/useWearLogs';
import { formatRelativeDate } from '@/utils/dateUtils';
import { colors, spacing } from '@/theme';

function RatingStars({ rating }) {
  if (!rating) return null;
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <MaterialCommunityIcons
          key={n}
          name={n <= rating ? 'star' : 'star-outline'}
          size={12}
          color={colors.goldAccent}
        />
      ))}
    </View>
  );
}

export default function WearHistoryScreen() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [allLogs, setAllLogs] = useState([]);

  const { data, isLoading, isError, refetch } = useWearHistory(page, 20);

  useEffect(() => {
    if (data?.logs) {
      setAllLogs((prev) => (page === 1 ? data.logs : [...prev, ...data.logs]));
    }
  }, [data]);

  const sections = useMemo(() => {
    const groups = {};
    allLogs.forEach((log) => {
      const key = format(new Date(log.wornAt), 'MMMM yyyy');
      if (!groups[key]) groups[key] = [];
      groups[key].push(log);
    });
    return Object.entries(groups).map(([title, data]) => ({ title, data }));
  }, [allLogs]);

  const hasMore = data ? page < data.pagination.totalPages : false;

  if (isLoading && page === 1) return <LoadingSpinner fullScreen />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <Screen edges={['top', 'bottom']} padded={false}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.primary} />
        </Pressable>
        <Text variant="titleMd">Wear History</Text>
        <View style={{ width: 22 }} />
      </View>

      {allLogs.length === 0 ? (
        <EmptyState
          icon="calendar-check-outline"
          title="No wear history yet"
          description="Log an outfit as worn to start building your history."
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item._id}
          stickySectionHeadersEnabled
          contentContainerStyle={styles.listContent}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text variant="labelCaps" color="secondary">{section.title.toUpperCase()}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() =>
                item.outfitId?._id &&
                router.push({ pathname: '/(modals)/outfit-detail', params: { outfitId: item.outfitId._id } })
              }
            >
              <OutfitItemsRow items={item.outfitId?.items || []} size={44} />
              <View style={styles.info}>
                <Text variant="titleSm" numberOfLines={1}>
                  {item.outfitId?.outfitName || 'Outfit'}
                </Text>
                <View style={styles.metaRow}>
                  <Text variant="bodyMd" color="secondary">{formatRelativeDate(item.wornAt)}</Text>
                  {item.context?.occasion && (
                    <Tag label={item.context.occasion} variant="static" style={styles.occasionTag} />
                  )}
                </View>
                <RatingStars rating={item.rating} />
              </View>
            </Pressable>
          )}
          refreshControl={
            <RefreshControl
              refreshing={isLoading && page === 1}
              onRefresh={() => {
                setPage(1);
                refetch();
              }}
              tintColor={colors.primary}
            />
          }
          ListFooterComponent={
            hasMore ? (
              <Button variant="ghost" onPress={() => setPage((p) => p + 1)} style={styles.loadMore}>
                Load More
              </Button>
            ) : null
          }
        />
      )}
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
  },
  listContent: { paddingHorizontal: spacing.gutter, paddingBottom: spacing.stackXl },
  sectionHeader: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.stackSm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.stackMd,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHigh,
  },
  info: { flex: 1, marginLeft: spacing.stackMd },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  occasionTag: { marginLeft: spacing.stackSm },
  starsRow: { flexDirection: 'row', marginTop: 4, gap: 2 },
  loadMore: { marginVertical: spacing.stackLg },
});

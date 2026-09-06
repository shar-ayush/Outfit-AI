// src/components/chat/ChatOutfitCard.jsx
//
// Inline outfit card shown when the stylist response is `type: 'outfits'`.
// Unlike a static mock card, this surfaces the actual recommendation
// pipeline output: ScoreBreakdown (compatibility/personalization/
// freshness) and real outfit actions (worn/saved/skipped, each a genuine
// RecommendationEvent on the backend).

import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Text from '@/components/common/Text';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Tag from '@/components/common/Tag';
import ScoreBreakdown from './ScoreBreakdown';
import { colors, spacing, radius } from '@/theme';

export default React.memo(function ChatOutfitCard({ outfit, onAction, actionLoading }) {
  return (
    <Card noPadding elevated style={styles.card}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itemsRow}>
        {outfit.items.map((item, i) => (
          <View key={item._id || i} style={styles.itemThumb}>
            <Image source={{ uri: item.imageUrl }} style={styles.itemImage} contentFit="contain" />
          </View>
        ))}
      </ScrollView>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text variant="titleMd" style={styles.name}>{outfit.outfitName}</Text>
          {outfit.vibe && <Tag label={outfit.vibe} variant="static" />}
        </View>

        {outfit.whyItWorks && (
          <Text variant="bodyMd" color="secondary" style={styles.whyItWorks} numberOfLines={3}>
            {outfit.whyItWorks}
          </Text>
        )}

        <View style={styles.scoreWrap}>
          <ScoreBreakdown score={outfit.score} />
        </View>

        <View style={styles.actionsRow}>
          <Button
            size="md"
            fullWidth={false}
            loading={actionLoading === 'worn'}
            onPress={() => onAction('worn')}
            style={styles.actionFlex}
          >
            Worn
          </Button>
          <Button
            variant="secondary"
            size="md"
            fullWidth={false}
            loading={actionLoading === 'saved'}
            onPress={() => onAction('saved')}
            style={styles.actionFlex}
          >
            Save
          </Button>
          <Button
            variant="ghost"
            size="md"
            fullWidth={false}
            loading={actionLoading === 'skipped'}
            onPress={() => onAction('skipped')}
            style={styles.actionFlex}
          >
            Skip
          </Button>
        </View>
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  card: { marginBottom: spacing.stackMd, maxWidth: '92%' },
  itemsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHigh,
  },
  itemThumb: {
    width: 84,
    height: 100,
    borderRightWidth: 1,
    borderRightColor: colors.surfaceContainerHigh,
  },
  itemImage: { width: '100%', height: '100%', padding: 8 },
  body: { padding: spacing.stackMd },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.stackSm,
  },
  name: { flex: 1, marginRight: spacing.stackSm },
  whyItWorks: { marginBottom: spacing.stackMd },
  scoreWrap: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    padding: spacing.stackSm,
    marginBottom: spacing.stackMd,
  },
  actionsRow: { flexDirection: 'row', gap: spacing.stackSm },
  actionFlex: { flex: 1 },
});

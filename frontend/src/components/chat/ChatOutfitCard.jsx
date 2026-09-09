import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Text from '@/components/common/Text';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Tag from '@/components/common/Tag';
import ScoreBreakdown from './ScoreBreakdown';
import { colors, spacing, radius } from '@/theme';

export default function ChatOutfitCard({ outfit, onAction, actionLoading }) {
  const [savedLocally, setSavedLocally] = React.useState(false);
  const isSaved = Boolean(outfit?.isSaved || savedLocally);

  const handleSave = () => {
    if (isSaved) return;
    setSavedLocally(true);
    onAction('saved');
  };

  if (!outfit) return null;

  const items = Array.isArray(outfit.items) ? outfit.items : [];
  const score = outfit.score || (outfit.compatibilityScore != null ? {
    total: outfit.compatibilityScore,
    algorithm: outfit.compatibilityScore,
    personalization: outfit.scoreBreakdown?.style || 50,
  } : null);

  return (
    <Card noPadding elevated style={styles.card}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itemsRow}>
        {items.map((item, i) => {
          const cloth = item?.clothId && typeof item.clothId === 'object' ? item.clothId : item;
          const imageUrl = cloth?.imageUrl || item?.imageUrl;
          const key = cloth?._id || item?._id || `thumb-${i}`;

          return (
            <View key={key} style={styles.itemThumb}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.itemImage} contentFit="contain" />
              ) : (
                <View style={styles.placeholderThumb} />
              )}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text variant="titleMd" style={styles.name}>{outfit.outfitName || 'Curated Outfit'}</Text>
          {outfit.vibe && <Tag label={outfit.vibe} variant="static" />}
        </View>

        {outfit.whyItWorks && (
          <Text variant="bodyMd" color="secondary" style={styles.whyItWorks} numberOfLines={3}>
            {outfit.whyItWorks}
          </Text>
        )}

        {score && (
          <View style={styles.scoreWrap}>
            <ScoreBreakdown score={score} />
          </View>
        )}

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
            disabled={isSaved}
            loading={actionLoading === 'saved'}
            onPress={handleSave}
            style={[styles.actionFlex, isSaved && styles.savedButton]}
          >
            {isSaved ? 'Saved' : 'Save'}
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
}

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
  savedButton: {
    backgroundColor: colors.surfaceContainerHigh,
    borderColor: colors.outlineVariant,
    opacity: 0.85,
  },
  placeholderThumb: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surfaceContainerHigh,
  },
});

// app/(app)/profile/preferences.jsx
//
// Entirely backed by GET /api/user/preferences (userController.getPreferences):
// favoriteItems (real ItemPreference.score > 0.7), contextProfiles (real
// ContextPreference frequency maps, normalized server-side), learningPhase,
// and the onboarding styleProfile. Nothing on this screen is computed from
// anything other than these real fields.
//
// LEARNING PHASE -> PERCENT: 0/1/2 mapped to 0%/40%/100% per the agreed
// plan language - a description of an ordinal real value, not invented data.

import React from 'react';
import { View, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Screen from '@/components/common/Screen';
import Text from '@/components/common/Text';
import Tag from '@/components/common/Tag';
import Button from '@/components/common/Button';
import ProgressBar from '@/components/common/ProgressBar';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorState from '@/components/common/ErrorState';
import EmptyState from '@/components/common/EmptyState';
import { usePreferences } from '@/hooks/useUser';
import { COLOR_HEX_MAP } from '@/constants/categories';
import { colors, spacing, radius } from '@/theme';

const PHASE_PERCENT = [0, 40, 100];

function prettifyContextKey(key) {
  return key
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' · ');
}

export default function PreferencesScreen() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = usePreferences();

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (isError || !data) return <ErrorState onRetry={refetch} />;

  const { favoriteItems, contextProfiles, learningPhase, styleProfile } = data;
  const activeContexts = contextProfiles.filter((c) => c.interactions > 0);

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.primary} />
        </Pressable>
        <Text variant="titleMd">My Style Profile</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.phaseSection}>
        <View style={styles.phaseRow}>
          <Text variant="bodyLg">Your style profile is</Text>
          <Text variant="titleMd">{PHASE_PERCENT[learningPhase]}% complete</Text>
        </View>
        <ProgressBar progress={PHASE_PERCENT[learningPhase] / 100} color="goldAccent" height={6} />
        <Text variant="caption" color="secondary" style={styles.phaseCaption}>
          Learning phase {learningPhase} · keep wearing and rating outfits to unlock deeper personalization.
        </Text>
      </View>

      {activeContexts.length > 0 && (
        <View style={styles.section}>
          <Text variant="headlineSm" style={styles.sectionTitle}>What You Wear, By Occasion</Text>
          {activeContexts.map((ctx) => (
            <View key={ctx.context} style={styles.contextCard}>
              <View style={styles.contextHeader}>
                <Text variant="titleSm">{prettifyContextKey(ctx.context)}</Text>
                <Text variant="caption" color="secondary">
                  {Math.round((ctx.confidence || 0) * 100)}% confidence
                </Text>
              </View>
              {ctx.topColors.length > 0 && (
                <View style={styles.colorRow}>
                  {ctx.topColors.map((color) => (
                    <View
                      key={color}
                      style={[styles.colorDot, { backgroundColor: COLOR_HEX_MAP[color] || colors.surfaceContainerHigh }]}
                    />
                  ))}
                  <Text variant="bodyMd" color="secondary" style={styles.colorLabel}>
                    {ctx.topColors.join(', ')}
                  </Text>
                </View>
              )}
              {ctx.topStyles.length > 0 && (
                <View style={styles.tagRow}>
                  {ctx.topStyles.map((style) => (
                    <Tag key={style} label={style} variant="static" style={styles.tagSpacing} />
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text variant="headlineSm" style={styles.sectionTitle}>Favorite Items</Text>
        {favoriteItems.length === 0 ? (
          <EmptyState
            icon="heart-outline"
            title="No favorites yet"
            description="Wear and save outfits — items you gravitate toward will show up here."
          />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.favRow}>
            {favoriteItems.map((fav) => (
              <Pressable
                key={fav.cloth._id}
                style={styles.favCard}
                onPress={() => router.push(`/(app)/wardrobe/${fav.cloth._id}`)}
              >
                <View style={styles.favImageWrap}>
                  <Image source={{ uri: fav.cloth.imageUrl }} style={styles.favImage} contentFit="contain" />
                </View>
                <ProgressBar progress={fav.score} height={4} style={styles.favScoreBar} />
                <Text variant="caption" color="secondary">{fav.wornCount} wears</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.section}>
        <Text variant="headlineSm" style={styles.sectionTitle}>Onboarding Profile</Text>
        <View style={styles.onboardingCard}>
          <ProfileRow label="Styles" value={styleProfile?.preferredStyles?.join(', ') || '—'} />
          <ProfileRow label="Colors" value={styleProfile?.preferredColors?.join(', ') || '—'} />
          <ProfileRow label="Climate" value={styleProfile?.climate || '—'} />
          <ProfileRow label="Formality" value={styleProfile?.preferredFormality?.join(', ') || '—'} />
        </View>
        <Button
          variant="secondary"
          onPress={() => router.push('/(auth)/onboarding/style-quiz')}
        >
          Redo Style Quiz
        </Button>
      </View>
    </Screen>
  );
}

function ProfileRow({ label, value }) {
  return (
    <View style={styles.profileRow}>
      <Text variant="bodyMd" color="secondary">{label}</Text>
      <Text variant="bodyMd" style={styles.profileValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.stackSm,
    marginBottom: spacing.stackLg,
  },
  phaseSection: { marginBottom: spacing.stackXl },
  phaseRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.stackSm },
  phaseCaption: { marginTop: spacing.stackSm },
  section: { marginBottom: spacing.stackXl },
  sectionTitle: { marginBottom: spacing.stackMd },
  contextCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.lg,
    padding: spacing.stackMd,
    marginBottom: spacing.stackMd,
  },
  contextHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.stackSm },
  colorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.stackSm },
  colorDot: { width: 14, height: 14, borderRadius: 7, marginRight: 4, borderWidth: 1, borderColor: colors.outlineVariant },
  colorLabel: { marginLeft: spacing.stackSm, textTransform: 'capitalize' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap' },
  tagSpacing: { marginRight: spacing.stackSm, marginBottom: spacing.stackSm },
  favRow: { gap: spacing.stackMd },
  favCard: { width: 96 },
  favImageWrap: {
    width: 96,
    height: 96,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    marginBottom: spacing.stackSm,
  },
  favImage: { width: '100%', height: '100%', padding: 8 },
  favScoreBar: { marginBottom: 4 },
  onboardingCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.lg,
    padding: spacing.stackMd,
    marginBottom: spacing.stackMd,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.stackSm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHigh,
  },
  profileValue: { textTransform: 'capitalize', fontFamily: 'Inter_600SemiBold', flexShrink: 1, textAlign: 'right' },
});

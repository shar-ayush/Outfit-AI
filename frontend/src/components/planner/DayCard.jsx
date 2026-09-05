// src/components/planner/DayCard.jsx
//
// NOTE ON FIELD NAME: backend populates OutfitPlan.outfitId in place (see
// planController.getWeekPlan / getPlans) — the populated Outfit document
// still lives at `plan.outfitId`, it isn't renamed to `plan.outfit`.
// Referencing `plan.outfitId.items[].clothId` throughout is correct.

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { format, isToday } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Text from '@/components/common/Text';
import Tag from '@/components/common/Tag';
import PlanStatusBadge from './PlanStatusBadge';
import OutfitItemsRow from '@/components/outfit/OutfitItemsRow';
import { colors, radius, spacing } from '@/theme';

export default function DayCard({ day, onPress }) {
  const dateObj = new Date(day.date);
  const today = isToday(dateObj);
  const plan = day.plan;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text variant="titleMd">
          {format(dateObj, 'EEEE, MMM d')}
          {today ? ' · Today' : ''}
        </Text>
        {plan && <PlanStatusBadge status={plan.status} />}
      </View>

      {plan ? (
        <View style={styles.plannedRow}>
          <OutfitItemsRow items={plan.outfitId?.items || []} size={48} />
          <View style={styles.plannedInfo}>
            <Text variant="bodyLg" numberOfLines={1}>
              {plan.outfitId?.outfitName || 'Planned outfit'}
            </Text>
            {plan.occasion && <Tag label={plan.occasion} variant="static" style={styles.occasionTag} />}
          </View>
        </View>
      ) : (
        <View style={styles.emptyRow}>
          <MaterialCommunityIcons name="plus-circle-outline" size={18} color={colors.secondary} />
          <Text variant="bodyLg" color="secondary" style={styles.emptyLabel}>
            Plan this day
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    padding: spacing.stackMd,
    marginBottom: spacing.stackMd,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.stackSm,
  },
  plannedRow: { flexDirection: 'row', alignItems: 'center' },
  plannedInfo: { marginLeft: spacing.stackMd, flex: 1 },
  occasionTag: { marginTop: 4, alignSelf: 'flex-start' },
  emptyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.stackSm },
  emptyLabel: { marginLeft: spacing.stackSm },
});

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Text from '@/components/common/Text';
import { colors, spacing, radius } from '@/theme';

const ACTIONS = [
  { key: 'tryon', icon: 'creation', label: 'Try-On', route: '/(modals)/try-on', highlight: true },
  { key: 'add', icon: 'plus', label: 'Add Item', route: '/(app)/wardrobe/upload' },
  { key: 'chat', icon: 'forum-outline', label: 'Style Chat', route: '/(app)/stylist' },
  { key: 'plan', icon: 'calendar-month-outline', label: 'Plan Week', route: '/(app)/planner' },
  { key: 'saved', icon: 'bookmark-outline', label: 'Saved', route: '/(app)/home/saved-outfits' },
];

export default function QuickActions({ onNavigate }) {
  return (
    <View style={styles.row}>
      {ACTIONS.map((action) => (
        <Pressable key={action.key} style={styles.action} onPress={() => onNavigate(action.route)}>
          <View style={[styles.iconCircle, action.highlight && styles.iconCircleHighlight]}>
            <MaterialCommunityIcons
              name={action.icon}
              size={22}
              color={action.highlight ? colors.goldAccent : colors.primary}
            />
          </View>
          <Text variant="labelCaps" style={styles.label} numberOfLines={2}>
            {action.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  action: { alignItems: 'center', flex: 1 },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.stackSm,
  },
  iconCircleHighlight: {
    borderWidth: 1.5,
    borderColor: colors.goldAccent,
    backgroundColor: colors.surfaceContainerLowest,
  },
  label: { textAlign: 'center' },
});


// src/components/common/Tag.jsx
//
// Pill-shaped chip — matches DESIGN.md "Chips" spec and the actual filter-bar
// markup in wardrobe_grid/code.html:
//   Primary filter row: solid #F0F0F0-ish bg (surfaceContainer) inactive,
//                        solid black bg when active
//   Secondary filter row: outlined (1px outline-variant border), no fill
//
// Usage:
//   <Tag label="All" active onPress={...} />                     — solid filter chip
//   <Tag label="Casual" variant="outline" onPress={...} />        — outline filter chip
//   <Tag label="Formal" variant="static" />                       — non-interactive badge (item detail metadata)
//   <Tag label="AI Suggested" variant="gold" icon="auto-awesome" /> — AI badge (see DESIGN.md "AI-Badge")

import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Text from './Text';
import { colors, radius, spacing } from '@/theme';

export default function Tag({
  label,
  active = false,
  variant = 'solid', // 'solid' | 'outline' | 'static' | 'gold'
  icon,
  onPress,
  style,
}) {
  const isGold = variant === 'gold';
  const isOutline = variant === 'outline' && !active;
  const isStatic = variant === 'static';

  const containerStyle = isGold
    ? styles.goldContainer
    : active
      ? styles.activeContainer
      : isOutline
        ? styles.outlineContainer
        : styles.staticContainer;

  const textColor = isGold ? 'onTertiaryContainer' : active ? 'onPrimary' : 'onSurfaceVariant';

  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        containerStyle,
        pressed && onPress && styles.pressed,
        style,
      ]}
    >
      {icon && (
        <MaterialCommunityIcons
          name={icon}
          size={13}
          color={colors[textColor]}
          style={styles.icon}
        />
      )}
      <Text variant="labelCaps" color={textColor}>
        {label}
      </Text>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    paddingHorizontal: spacing.stackMd,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  activeContainer: { backgroundColor: colors.primary },
  staticContainer: { backgroundColor: colors.surfaceContainer },
  outlineContainer: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingVertical: 6, // slightly slimmer, matches secondary filter row
  },
  goldContainer: { backgroundColor: colors.goldAccentLight },
  icon: { marginRight: 4 },
  pressed: { opacity: 0.7 },
});

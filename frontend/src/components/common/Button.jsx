// src/components/common/Button.jsx
//
// Matches DESIGN.md "Buttons" spec exactly:
//   Primary   — solid #000000 bg, white text, 8px radius
//   Secondary — white bg, 1px #000000 border
//   Premium   — solid gold (#C9A84C) bg — reserve for upgrade/special-edition CTAs only
//   Ghost     — no fill/border, used for circular icon buttons in headers
//     (e.g. back arrow, search, sort icons seen across every Stitch screen header)
//
// Usage:
//   <Button onPress={submit}>Get Started</Button>
//   <Button variant="secondary" onPress={goLogin}>Login</Button>
//   <Button variant="premium" onPress={upgrade}>Upgrade</Button>
//   <Button variant="ghost" icon="arrow-back" onPress={goBack} />
//   <Button loading disabled>Sign Up</Button>

import React from 'react';
import { Pressable, ActivityIndicator, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Text from './Text';
import { colors, radius, spacing } from '@/theme';

const VARIANT_STYLES = {
  primary: {
    container: { backgroundColor: colors.primary, borderWidth: 0 },
    textColor: 'onPrimary',
  },
  secondary: {
    container: {
      backgroundColor: colors.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    textColor: 'onSurface',
  },
  premium: {
    container: { backgroundColor: colors.goldAccent, borderWidth: 0 },
    textColor: 'onTertiary',
  },
  ghost: {
    container: { backgroundColor: 'transparent', borderWidth: 0 },
    textColor: 'onSurface',
  },
};

export default function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'lg', // 'lg' (full-width CTA, py-4) | 'md' (inline actions) | 'icon' (circular)
  icon, // MaterialCommunityIcons name — renders icon-only if no children, or icon+label if both
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = true,
  haptic = true,
  style,
  textStyle,
  ...rest
}) {
  const v = VARIANT_STYLES[variant] || VARIANT_STYLES.primary;
  const isIconOnly = size === 'icon' || (icon && !children);

  const handlePress = (e) => {
    if (disabled || loading) return;
    if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(e);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        isIconOnly ? styles.iconContainer : styles.container,
        size === 'md' && styles.mdPadding,
        v.container,
        fullWidth && !isIconOnly && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={colors[v.textColor] || colors.onPrimary} />
      ) : isIconOnly ? (
        <MaterialCommunityIcons
          name={icon}
          size={20}
          color={colors[v.textColor] || colors.onSurface}
        />
      ) : (
        <View style={styles.row}>
          {icon && iconPosition === 'left' && (
            <MaterialCommunityIcons
              name={icon}
              size={18}
              color={colors[v.textColor]}
              style={styles.iconLeft}
            />
          )}
          <Text variant="titleMd" color={v.textColor} style={textStyle}>
            {children}
          </Text>
          {icon && iconPosition === 'right' && (
            <MaterialCommunityIcons
              name={icon}
              size={18}
              color={colors[v.textColor]}
              style={styles.iconRight}
            />
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.DEFAULT,
    paddingVertical: 16, // py-4
    alignItems: 'center',
    justifyContent: 'center',
  },
  mdPadding: {
    paddingVertical: 10,
    paddingHorizontal: spacing.stackMd,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: { width: '100%' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  iconLeft: { marginRight: spacing.stackSm },
  iconRight: { marginLeft: spacing.stackSm },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});

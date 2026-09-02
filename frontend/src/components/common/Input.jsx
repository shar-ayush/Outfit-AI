// src/components/common/Input.jsx
//
// Two variants matching the two input treatments actually used across the
// Stitch auth screens:
//   "outlined"  — boxed, 1px border, used on login_screen
//   "underline" — floating-label, bottom-border-only, used on register_screen
//
// Designed to drop straight into React Hook Form's <Controller>:
//   <Controller
//     control={control}
//     name="email"
//     render={({ field: { onChange, onBlur, value } }) => (
//       <Input variant="underline" label="Email" value={value}
//              onChangeText={onChange} onBlur={onBlur} error={errors.email?.message} />
//     )}
//   />

import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Text from './Text';
import { colors, typography, radius, spacing } from '@/theme';

export default function Input({
  variant = 'outlined',
  label,
  placeholder,
  value,
  onChangeText,
  onBlur,
  error,
  secureTextEntry,
  icon,
  containerStyle,
  ...rest
}) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secureTextEntry);
  const isFloating = focused || (value && value.length > 0);

  const borderColor = error
    ? colors.error
    : focused
      ? colors.primary
      : variant === 'outlined'
        ? colors.surfaceContainerHigh
        : colors.surfaceContainerHigh;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {variant === 'outlined' ? (
        <View
          style={[
            styles.outlinedBox,
            { borderColor },
            icon && styles.rowCenter,
          ]}
        >
          {icon && (
            <MaterialCommunityIcons
              name={icon}
              size={18}
              color={colors.secondary}
              style={{ marginRight: spacing.stackSm }}
            />
          )}
          <TextInput
            value={value}
            onChangeText={onChangeText}
            onFocus={() => setFocused(true)}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            placeholder={placeholder}
            placeholderTextColor={colors.secondaryFixedDim}
            secureTextEntry={hidden}
            style={[typography.bodyLg, styles.outlinedInput, { color: colors.onSurface }]}
            {...rest}
          />
          {secureTextEntry && (
            <Pressable onPress={() => setHidden((h) => !h)} hitSlop={8}>
              <MaterialCommunityIcons
                name={hidden ? 'eye-outline' : 'eye-off-outline'}
                size={18}
                color={colors.secondary}
              />
            </Pressable>
          )}
        </View>
      ) : (
        <View style={styles.underlineBox}>
          {label && (
            <Text
              variant={isFloating ? 'labelMd' : 'bodyLg'}
              color={isFloating ? 'secondary' : 'secondaryFixedDim'}
              style={[
                styles.floatingLabel,
                isFloating && styles.floatingLabelUp,
              ]}
            >
              {label}
            </Text>
          )}
          <TextInput
            value={value}
            onChangeText={onChangeText}
            onFocus={() => setFocused(true)}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            placeholder={isFloating ? placeholder : ''}
            placeholderTextColor={colors.secondaryFixedDim}
            secureTextEntry={hidden}
            style={[
              typography.bodyLg,
              styles.underlineInput,
              { color: colors.onSurface, borderBottomColor: borderColor },
            ]}
            {...rest}
          />
          {secureTextEntry && (
            <Pressable
              onPress={() => setHidden((h) => !h)}
              hitSlop={8}
              style={styles.underlineEyeIcon}
            >
              <MaterialCommunityIcons
                name={hidden ? 'eye-outline' : 'eye-off-outline'}
                size={18}
                color={colors.secondary}
              />
            </Pressable>
          )}
        </View>
      )}
      {!!error && (
        <Text variant="caption" color="error" style={styles.errorText}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%', marginBottom: spacing.stackMd },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },

  // Outlined variant
  outlinedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: spacing.gutter,
  },
  outlinedInput: {
    flex: 1,
    paddingVertical: 14, // py-3
  },

  // Underline / floating-label variant
  underlineBox: { position: 'relative', paddingTop: 20 },
  underlineInput: {
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  floatingLabel: {
    position: 'absolute',
    left: 0,
    top: 28,
  },
  floatingLabelUp: {
    top: 0,
  },
  underlineEyeIcon: {
    position: 'absolute',
    right: 0,
    bottom: 10,
  },

  errorText: { marginTop: spacing.stackXs },
});

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
import { View, TextInput, StyleSheet, Pressable, Platform } from 'react-native';
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
      : colors.outlineVariant || '#C4C7C7';

  const baseInputStyle = [
    styles.inputBase,
    variant === 'outlined' ? styles.outlinedInput : styles.underlineInput,
    variant === 'underline' && { borderBottomColor: borderColor },
    { color: colors.onSurface },
  ];

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
            value={value ?? ''}
            onChangeText={onChangeText}
            onFocus={() => setFocused(true)}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            placeholder={placeholder}
            placeholderTextColor={colors.secondaryFixedDim}
            secureTextEntry={hidden}
            cursorColor={colors.primary}
            selectionColor="rgba(0, 0, 0, 0.25)"
            underlineColorAndroid="transparent"
            style={baseInputStyle}
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
              pointerEvents="none"
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
          <View style={[styles.underlineInputRow, { borderBottomColor: borderColor }]}>
            <TextInput
              value={value ?? ''}
              onChangeText={onChangeText}
              onFocus={() => setFocused(true)}
              onBlur={(e) => {
                setFocused(false);
                onBlur?.(e);
              }}
              placeholder={isFloating && placeholder !== label ? placeholder : ''}
              placeholderTextColor={colors.secondaryFixedDim}
              secureTextEntry={hidden}
              cursorColor={colors.primary}
              selectionColor="rgba(0, 0, 0, 0.25)"
              underlineColorAndroid="transparent"
              style={[styles.inputBase, styles.underlineInput]}
              {...rest}
            />
            {secureTextEntry && (
              <Pressable
                onPress={() => setHidden((h) => !h)}
                hitSlop={8}
                style={styles.eyeButton}
              >
                <MaterialCommunityIcons
                  name={hidden ? 'eye-outline' : 'eye-off-outline'}
                  size={18}
                  color={colors.secondary}
                />
              </Pressable>
            )}
          </View>
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

  inputBase: {
    flex: 1,
    fontSize: 15,
    color: colors.onSurface,
    ...(Platform.OS === 'ios'
      ? { fontFamily: 'Inter_400Regular' }
      : { includeFontPadding: false }),
  },

  // Outlined variant
  outlinedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.DEFAULT,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: spacing.gutter,
    minHeight: 50,
  },
  outlinedInput: {
    paddingVertical: Platform.OS === 'android' ? 0 : 12,
    height: Platform.OS === 'android' ? 48 : undefined,
    textAlignVertical: 'center',
  },

  // Underline / floating-label variant
  underlineBox: {
    position: 'relative',
    paddingTop: 18,
  },
  underlineInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    paddingBottom: Platform.OS === 'android' ? 2 : 6,
    minHeight: 40,
  },
  underlineInput: {
    flex: 1,
    paddingVertical: Platform.OS === 'android' ? 2 : 4,
    height: Platform.OS === 'android' ? 40 : undefined,
    textAlignVertical: 'center',
  },
  floatingLabel: {
    position: 'absolute',
    left: 0,
    top: 26,
  },
  floatingLabelUp: {
    top: 0,
  },
  eyeButton: {
    paddingLeft: 8,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },

  errorText: { marginTop: spacing.stackXs },
});

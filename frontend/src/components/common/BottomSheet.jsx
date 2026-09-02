// src/components/common/BottomSheet.jsx
//
// Lightweight bottom sheet built on RN's Modal + Reanimated slide-up —
// no external bottom-sheet library needed for this app's use cases
// (upload FAB picker, ClothFilter, OutfitPicker, sort menus).
//
// For scrollable content inside, wrap children in a ScrollView yourself —
// this component just provides the sheet chrome (handle, backdrop, safe
// area, slide animation).
//
// Usage:
//   <BottomSheet visible={open} onClose={() => setOpen(false)} title="Add Item">
//     <SheetOption icon="camera" label="Add Single Item" onPress={...} />
//     <SheetOption icon="image-multiple" label="Add Multiple Items" onPress={...} />
//   </BottomSheet>

import React, { useEffect } from 'react';
import { Modal, Pressable, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Text from './Text';
import { colors, radius, spacing, shadows } from '@/theme';

export default function BottomSheet({ visible, onClose, title, children }) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(400);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 22, stiffness: 200 });
      backdropOpacity.value = withTiming(1, { duration: 200 });
    } else {
      translateY.value = withTiming(400, { duration: 200 });
      backdropOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            shadows.lg,
            { paddingBottom: insets.bottom + spacing.stackMd },
            sheetStyle,
          ]}
        >
          <View style={styles.handle} />
          {title && (
            <View style={styles.header}>
              <Text variant="titleMd">{title}</Text>
              <Pressable onPress={onClose} hitSlop={8}>
                <MaterialCommunityIcons name="close" size={22} color={colors.onSurfaceVariant} />
              </Pressable>
            </View>
          )}
          <View style={styles.content}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// Common row pattern used inside sheets (upload picker, action menus)
export function SheetOption({ icon, label, onPress, destructive = false }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.option, pressed && { opacity: 0.7 }]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={22}
        color={destructive ? colors.error : colors.onSurface}
        style={styles.optionIcon}
      />
      <Text variant="bodyLg" color={destructive ? 'error' : 'onSurface'}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(26, 28, 28, 0.5)' },
  sheet: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.stackSm,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerHigh,
    alignSelf: 'center',
    marginBottom: spacing.stackMd,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter,
    paddingBottom: spacing.stackMd,
  },
  content: { paddingHorizontal: spacing.gutter },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.stackMd,
  },
  optionIcon: { marginRight: spacing.stackMd },
});

import React from 'react';
import { Modal as RNModal, View, Pressable, StyleSheet } from 'react-native';
import { colors, radius, spacing, shadows } from '@/theme';

export default function Modal({ visible, onRequestClose, children, style }) {
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onRequestClose}>
        <Pressable style={[styles.card, shadows.lg, style]} onPress={(e) => e.stopPropagation()}>
          {children}
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 28, 28, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.stackLg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.stackLg,
  },
});

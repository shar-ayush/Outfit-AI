// src/components/common/Modal.jsx
//
// Centered dialog modal — for confirmations (delete account, permanent
// delete item, logout) as opposed to the full-screen (modals) route group
// or the bottom-sheet pattern (use BottomSheet.jsx for pickers/filters).
//
// Usage:
//   <Modal visible={confirmOpen} onRequestClose={() => setConfirmOpen(false)}>
//     <Text variant="titleMd">Delete this item?</Text>
//     <Text variant="bodyMd" color="secondary">This can't be undone.</Text>
//     <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
//       <Button variant="secondary" onPress={close}>Cancel</Button>
//       <Button onPress={confirmDelete}>Delete</Button>
//     </View>
//   </Modal>

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

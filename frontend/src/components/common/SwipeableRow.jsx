// src/components/common/SwipeableRow.jsx
//
// Swipe-to-reveal-actions row — used for wear history list, wardrobe list
// rows (swipe to archive), saved outfit rows (swipe to delete).
// Built on react-native-gesture-handler's Swipeable, which ships as part
// of the gesture-handler package already in our dependency list.
//
// Usage:
//   <SwipeableRow
//     rightActions={[
//       { label: 'Archive', color: colors.secondary, icon: 'archive-outline', onPress: handleArchive },
//       { label: 'Delete', color: colors.error, icon: 'delete-outline', onPress: handleDelete },
//     ]}
//   >
//     <WearHistoryRow log={log} />
//   </SwipeableRow>

import React, { useRef } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Text from './Text';
import { colors, spacing } from '@/theme';

export default function SwipeableRow({ children, rightActions = [] }) {
  const swipeableRef = useRef(null);

  const renderRightActions = () => (
    <View style={styles.actionsContainer}>
      {rightActions.map((action, i) => (
        <Pressable
          key={i}
          style={[styles.action, { backgroundColor: action.color || colors.secondary }]}
          onPress={() => {
            swipeableRef.current?.close();
            action.onPress?.();
          }}
        >
          <MaterialCommunityIcons name={action.icon} size={20} color={colors.onPrimary} />
          <Text variant="caption" color="onPrimary" style={styles.actionLabel}>
            {action.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  if (rightActions.length === 0) return children;

  return (
    <Swipeable ref={swipeableRef} renderRightActions={renderRightActions} overshootRight={false}>
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  actionsContainer: { flexDirection: 'row' },
  action: {
    width: 76,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.stackSm,
  },
  actionLabel: { marginTop: 4 },
});

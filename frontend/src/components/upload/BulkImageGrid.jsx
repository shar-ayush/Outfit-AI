import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Text from '@/components/common/Text';
import { colors, spacing, radius } from '@/theme';

export function SelectionGrid({ assets, selectedUris, onToggle }) {
  return (
    <View style={styles.grid}>
      {assets.map((asset) => {
        const index = selectedUris.indexOf(asset.uri);
        const selected = index !== -1;
        return (
          <Pressable key={asset.uri} style={styles.gridItem} onPress={() => onToggle(asset)}>
            <Image source={{ uri: asset.uri }} style={styles.gridImage} contentFit="cover" />
            {selected && (
              <View style={styles.selectedOverlay}>
                <View style={styles.numberBadge}>
                  <Text variant="caption" color="onPrimary" style={styles.numberText}>
                    {index + 1}
                  </Text>
                </View>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

export function ProgressQueue({ items }) {
  return (
    <View style={styles.queue}>
      {items.map((item) => (
        <View key={item.uri} style={styles.queueRow}>
          <Image source={{ uri: item.uri }} style={styles.queueThumb} contentFit="cover" />
          <View style={styles.queueInfo}>
            <Text variant="titleSm" numberOfLines={1}>
              {item.name || item.fileName}
            </Text>
            <StatusLabel status={item.status} error={item.error} />
          </View>
          <StatusIcon status={item.status} />
        </View>
      ))}
    </View>
  );
}

function StatusLabel({ status, error }) {
  if (status === 'failed') {
    return (
      <Text variant="caption" color="error">
        {error || 'Upload failed'}
      </Text>
    );
  }
  if (status === 'done') {
    return <Text variant="caption" color="success">DONE</Text>;
  }
  return <Text variant="caption" color="secondary">UPLOADING</Text>;
}

function StatusIcon({ status }) {
  if (status === 'done') {
    return <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />;
  }
  if (status === 'failed') {
    return <MaterialCommunityIcons name="alert-circle" size={20} color={colors.error} />;
  }
  return <MaterialCommunityIcons name="cloud-upload-outline" size={20} color={colors.secondary} />;
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.stackSm },
  gridItem: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainer,
  },
  gridImage: { width: '100%', height: '100%' },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    padding: 6,
  },
  numberBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  queue: { gap: spacing.stackSm },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.stackSm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
  },
  queueThumb: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceContainer,
    marginRight: spacing.stackSm,
  },
  queueInfo: { flex: 1, marginRight: spacing.stackSm },
});

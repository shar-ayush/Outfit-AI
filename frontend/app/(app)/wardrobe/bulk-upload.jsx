import React, { useState } from 'react';
import { View, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Screen from '@/components/common/Screen';
import Text from '@/components/common/Text';
import Button from '@/components/common/Button';
import EmptyState from '@/components/common/EmptyState';
import { SelectionGrid, ProgressQueue } from '@/components/upload/BulkImageGrid';
import { useImagePicker } from '@/hooks/useImagePicker';
import { useUploadBulkClothes } from '@/hooks/useWardrobe';
import { compressImageForUpload } from '@/utils/imageUtils';
import { useUIStore } from '@/stores';
import { colors, spacing } from '@/theme';

const MAX_ITEMS = 20;

export default function BulkUploadScreen() {
  const router = useRouter();
  const showToast = useUIStore((s) => s.showToast);
  const { pickMultipleFromGallery } = useImagePicker();
  const uploadBulk = useUploadBulkClothes();

  const [assets, setAssets] = useState([]);
  const [phase, setPhase] = useState('select');
  const [queueItems, setQueueItems] = useState([]);
  const [summary, setSummary] = useState(null);

  const handlePickMore = async () => {
    const picked = await pickMultipleFromGallery(MAX_ITEMS - assets.length);
    if (picked.length > 0) {
      setAssets((prev) => [...prev, ...picked].slice(0, MAX_ITEMS));
    }
  };

  const handleToggle = (asset) => {
    setAssets((prev) =>
      prev.some((a) => a.uri === asset.uri)
        ? prev.filter((a) => a.uri !== asset.uri)
        : prev.length < MAX_ITEMS
          ? [...prev, asset]
          : prev
    );
  };

  const handleUploadAll = async () => {
    if (assets.length === 0) return;
    setPhase('uploading');
    setQueueItems(assets.map((a) => ({ uri: a.uri, fileName: a.fileName, status: 'uploading' })));

    try {
      const compressedAssets = await Promise.all(
        assets.map(async (a) => {
          const compressed = await compressImageForUpload(a.uri);
          return { ...a, uri: compressed.uri, originalUri: a.uri };
        })
      );

      const result = await new Promise((resolve, reject) => {
        uploadBulk.mutate(compressedAssets, { onSuccess: resolve, onError: reject });
      });

      const failedIndexes = new Set(result.errors.map((e) => e.index));
      let successCursor = 0;
      const finalQueue = assets.map((a, i) => {
        if (failedIndexes.has(i)) {
          const err = result.errors.find((e) => e.index === i);
          return { uri: a.uri, fileName: a.fileName, status: 'failed', error: err?.error };
        }
        const cloth = result.items[successCursor];
        successCursor += 1;
        return { uri: a.uri, fileName: a.fileName, status: 'done', name: cloth?.subCategory || cloth?.name };
      });

      setQueueItems(finalQueue);
      setSummary({ uploaded: result.uploaded, failed: result.failed });
      setPhase('summary');
    } catch (error) {
      showToast('Bulk upload failed - please try again', 'error');
      setPhase('select');
    }
  };

  const selectedUris = assets.map((a) => a.uri);

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.primary} />
        </Pressable>
        <Text variant="titleMd">
          {phase === 'summary' ? 'Upload Complete' : 'Bulk Upload'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {phase === 'select' && (
        <>
          <Text variant="bodyLg" color="secondary" style={styles.subtitle}>
            Select up to {MAX_ITEMS} items for bulk upload.
          </Text>
          <Text variant="labelCaps" color="secondary" style={styles.counter}>
            {assets.length} / {MAX_ITEMS} SELECTED
          </Text>

          {assets.length === 0 ? (
            <EmptyState
              icon="image-multiple-outline"
              title="No photos selected"
              description="Choose several clothing photos from your gallery to add them all at once."
              actionLabel="Choose Photos"
              onAction={handlePickMore}
            />
          ) : (
            <>
              <SelectionGrid assets={assets} selectedUris={selectedUris} onToggle={handleToggle} />
              <Button variant="secondary" onPress={handlePickMore} style={styles.addMoreButton}>
                Add More Photos
              </Button>
              <Button onPress={handleUploadAll} style={styles.continueButton}>
                Continue with {assets.length} items
              </Button>
            </>
          )}
        </>
      )}

      {phase === 'uploading' && (
        <>
          <Text variant="bodyLg" color="secondary" style={styles.subtitle}>
            Uploading and analyzing your items...
          </Text>
          <ProgressQueue items={queueItems} />
        </>
      )}

      {phase === 'summary' && (
        <>
          <Text variant="bodyLg" color="secondary" style={styles.subtitle}>
            {summary.uploaded} of {assets.length} items added.
            {summary.failed > 0 ? ` ${summary.failed} failed.` : ''}
          </Text>
          <ProgressQueue items={queueItems} />
          <Button onPress={() => router.replace('/(app)/wardrobe')} style={styles.continueButton}>
            Back to Wardrobe
          </Button>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.stackSm,
  },
  subtitle: { marginTop: spacing.stackSm, marginBottom: spacing.stackSm },
  counter: { marginBottom: spacing.stackMd },
  addMoreButton: { marginTop: spacing.stackLg },
  continueButton: { marginTop: spacing.stackMd, marginBottom: spacing.stackLg },
});

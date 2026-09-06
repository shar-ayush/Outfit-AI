// app/(app)/wardrobe/upload.jsx
//
// Flow: choose camera/gallery -> preview (with compress-before-upload) ->
// optional metadata -> upload (with simulated step progress, see
// UploadProgress.jsx) -> success, back to wardrobe grid.
//
// See useImagePicker.js for why this uses the native picker's camera
// rather than a fully custom expo-camera screen.

import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Screen from '@/components/common/Screen';
import Text from '@/components/common/Text';
import Button from '@/components/common/Button';
import ImagePreview from '@/components/upload/ImagePreview';
import MetadataForm from '@/components/upload/MetadataForm';
import UploadProgress from '@/components/upload/UploadProgress';
import { useImagePicker } from '@/hooks/useImagePicker';
import { useUploadCloth } from '@/hooks/useWardrobe';
import { compressImageForUpload } from '@/utils/imageUtils';
import { useUIStore } from '@/stores';
import { colors, spacing, radius } from '@/theme';

export default function UploadScreen() {
  const router = useRouter();
  const showToast = useUIStore((s) => s.showToast);
  const { pickFromCamera, pickFromGallery } = useImagePicker();
  const uploadCloth = useUploadCloth();

  const [asset, setAsset] = useState(null);
  const [metadata, setMetadata] = useState({ name: '', brand: '', purchasePrice: '' });
  const [uploadStatus, setUploadStatus] = useState(null);
  const [resultSummary, setResultSummary] = useState(null);

  const handlePick = async (source) => {
    const picked = source === 'camera' ? await pickFromCamera() : await pickFromGallery();
    if (picked) setAsset(picked);
  };

  const handleUpload = async () => {
    if (!asset) return;
    setUploadStatus('uploading');

    try {
      const compressed = await compressImageForUpload(asset.uri);
      const cloth = await new Promise((resolve, reject) => {
        uploadCloth.mutate(
          {
            asset: { ...asset, uri: compressed.uri },
            extra: {
              name: metadata.name || undefined,
              brand: metadata.brand || undefined,
              purchasePrice: metadata.purchasePrice || undefined,
            },
          },
          { onSuccess: resolve, onError: reject }
        );
      });

      setUploadStatus('done');
      setResultSummary(cloth);
      setTimeout(() => router.back(), 1600);
    } catch (error) {
      setUploadStatus('error');
      showToast(error?.response?.data?.message || 'Upload failed - please try again', 'error');
    }
  };

  if (!asset) {
    return (
      <Screen edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <MaterialCommunityIcons name="close" size={24} color={colors.primary} />
          </Pressable>
          <Text variant="titleMd">Add Item</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.pickerBody}>
          <View style={styles.pickerIconCircle}>
            <MaterialCommunityIcons name="tshirt-crew-outline" size={40} color={colors.secondary} />
          </View>
          <Text variant="headlineSm" style={styles.pickerTitle}>
            Photograph or select an item
          </Text>
          <Text variant="bodyLg" color="secondary" style={styles.pickerSubtitle}>
            Lay it flat or hang it against a plain background for best results.
          </Text>

          <Button icon="camera" onPress={() => handlePick('camera')} style={styles.pickerButton}>
            Take Photo
          </Button>
          <Button
            variant="secondary"
            icon="image-multiple-outline"
            onPress={() => handlePick('gallery')}
            style={styles.pickerButton}
          >
            Choose from Gallery
          </Button>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => (uploadStatus ? null : setAsset(null))} hitSlop={8}>
          <MaterialCommunityIcons
            name="close"
            size={24}
            color={uploadStatus ? colors.surfaceContainerHigh : colors.primary}
          />
        </Pressable>
        <Text variant="titleMd">Add Item</Text>
        <View style={{ width: 24 }} />
      </View>

      <ImagePreview originalUri={asset.uri} processedUri={resultSummary?.imageUrl} />

      {uploadStatus ? (
        <View style={styles.progressWrap}>
          <UploadProgress status={uploadStatus} />
          {uploadStatus === 'done' && resultSummary && (
            <View style={styles.successBanner}>
              <MaterialCommunityIcons name="check-circle" size={18} color={colors.success} />
              <Text variant="bodyMd" style={styles.successText}>
                Smart Analysis Complete - {resultSummary.color?.primary} {resultSummary.subCategory},{' '}
                {resultSummary.formality}, {resultSummary.style?.[0]}
              </Text>
            </View>
          )}
        </View>
      ) : (
        <>
          <View style={styles.formWrap}>
            <MetadataForm value={metadata} onChange={setMetadata} />
          </View>
          <Button onPress={handleUpload} style={styles.uploadButton}>
            Upload Item
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
  pickerBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.stackLg },
  pickerIconCircle: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.stackLg,
  },
  pickerTitle: { textAlign: 'center', marginBottom: spacing.stackSm },
  pickerSubtitle: { textAlign: 'center', marginBottom: spacing.stackXl, maxWidth: 280 },
  pickerButton: { marginBottom: spacing.stackMd },
  formWrap: { marginTop: spacing.stackLg, marginBottom: spacing.stackLg },
  uploadButton: { marginBottom: spacing.stackLg },
  progressWrap: { marginTop: spacing.stackLg },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3EFE9',
    borderRadius: radius.md,
    padding: spacing.stackMd,
    marginTop: spacing.stackMd,
  },
  successText: { marginLeft: spacing.stackSm, flex: 1, textTransform: 'capitalize' },
});

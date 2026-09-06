// src/components/upload/ImagePreview.jsx
//
// Matches upload_preview_processing's ORIGINAL/CUTOUT toggle. Since
// background removal happens server-side (during the actual upload
// request — see wardrobeService.uploadSingleCloth), we only have the
// original captured image client-side until the request completes. Before
// upload completes, both toggle states show the same original photo; once
// the server responds with the processed cloth.imageUrl, we swap CUTOUT to
// show the real background-removed result.

import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Text from '@/components/common/Text';
import { colors, radius, spacing } from '@/theme';

export default function ImagePreview({ originalUri, processedUri }) {
  const [showCutout, setShowCutout] = useState(false);
  const cutoutAvailable = !!processedUri;

  return (
    <View>
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: showCutout && cutoutAvailable ? processedUri : originalUri }}
          style={styles.image}
          contentFit={showCutout && cutoutAvailable ? 'contain' : 'cover'}
          transition={200}
        />
      </View>

      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggleButton, !showCutout && styles.toggleActive]}
          onPress={() => setShowCutout(false)}
        >
          <Text variant="labelCaps" color={!showCutout ? 'onPrimary' : 'secondary'}>
            ORIGINAL
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleButton, showCutout && styles.toggleActive]}
          onPress={() => setShowCutout(true)}
        >
          <Text variant="labelCaps" color={showCutout ? 'onPrimary' : 'secondary'}>
            CUTOUT {!cutoutAvailable && '(processing...)'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  imageWrap: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainerLow,
  },
  image: { width: '100%', height: '100%' },
  toggleRow: {
    flexDirection: 'row',
    marginTop: spacing.stackMd,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.full,
    padding: 3,
  },
  toggleButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  toggleActive: { backgroundColor: colors.primary },
});

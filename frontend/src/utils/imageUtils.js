// src/utils/imageUtils.js
//
// Per plan: "Compress images client-side before upload using Expo
// ImageManipulator. Resize to max 1200x1200. Convert to JPEG at 85%
// quality." Applied right before the multipart upload — the original
// captured/picked asset is left untouched so ImagePreview's "ORIGINAL"
// toggle still shows the true original.

import * as ImageManipulator from 'expo-image-manipulator';

const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.85;

export async function compressImageForUpload(uri) {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_DIMENSION } }], // height auto-scales, preserves aspect ratio
    { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result; // { uri, width, height }
}

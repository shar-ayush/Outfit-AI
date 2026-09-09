import * as ImageManipulator from 'expo-image-manipulator';

const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.85;

export async function compressImageForUpload(uri) {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_DIMENSION } }],
    { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result;
}

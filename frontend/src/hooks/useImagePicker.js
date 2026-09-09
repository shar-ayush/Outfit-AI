import { useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useUIStore } from '@/stores';

export function useImagePicker() {
  const showToast = useUIStore((s) => s.showToast);

  const pickFromCamera = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showToast('Camera permission is required to add items this way.', 'error');
      return null;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 1,
      allowsEditing: false,
    });
    if (result.canceled) return null;
    return result.assets[0];
  }, []);

  const pickFromGallery = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showToast('Photo library permission is required to add items this way.', 'error');
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (result.canceled) return null;
    return result.assets[0];
  }, []);

  const pickMultipleFromGallery = useCallback(async (maxCount = 20) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showToast('Photo library permission is required to add items this way.', 'error');
      return [];
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsMultipleSelection: true,
      selectionLimit: maxCount,
    });
    if (result.canceled) return [];
    return result.assets;
  }, []);

  return { pickFromCamera, pickFromGallery, pickMultipleFromGallery };
}

export default useImagePicker;

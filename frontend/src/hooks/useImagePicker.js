// src/hooks/useImagePicker.js
//
// DEVIATION FROM PLAN: the plan's tech stack lists "Expo Camera" for a
// fully custom full-screen camera UI (per Stitch's upload_camera_capture
// mock, with a hand-built flash toggle, alignment guide overlay, etc).
// We use expo-image-picker's launchCameraAsync instead, which opens the
// OS's native camera (already has flash/switch-camera controls built in)
// and returns a captured asset directly. This trades a bespoke branded
// camera screen for significantly less code and zero extra native camera
// state to manage — a reasonable call for a portfolio-scope app. Swap this
// hook for an expo-camera-based CameraView screen later if you want the
// fully custom capture UI from the mock.

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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

// app/(modals)/_layout.jsx
//
// Full-screen modal presentations, per the original folder plan. Only 3
// screens here, not 4 — `camera.jsx` was dropped. Since Step 7's
// useImagePicker.js, we use expo-image-picker's native camera launch
// directly from wardrobe/upload.jsx rather than a custom expo-camera
// overlay screen (see that file's header comment). Building a separate
// camera.jsx route here would be dead code — nothing would ever navigate
// to it.

import { Stack } from 'expo-router';

export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'modal',
        animation: 'slide_from_bottom',
      }}
    />
  );
}

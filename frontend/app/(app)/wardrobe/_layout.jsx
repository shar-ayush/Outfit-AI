// app/(app)/wardrobe/_layout.jsx
//
// Nested Stack under the Wardrobe tab: grid (index) → item detail →
// upload / bulk-upload as pushed screens, each with its own custom header.

import { Stack } from 'expo-router';

export default function WardrobeLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[clothId]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="upload" options={{ presentation: 'modal' }} />
      <Stack.Screen name="bulk-upload" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

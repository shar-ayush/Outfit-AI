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

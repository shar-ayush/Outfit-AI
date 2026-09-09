import { Stack } from 'expo-router';

export default function StylistLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="sessions" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}

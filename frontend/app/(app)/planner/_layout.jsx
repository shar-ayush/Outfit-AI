// app/(app)/planner/_layout.jsx

import { Stack } from 'expo-router';

export default function PlannerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[date]" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
      <Stack.Screen name="design" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}

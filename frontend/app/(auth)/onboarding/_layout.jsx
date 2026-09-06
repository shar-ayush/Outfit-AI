// app/(auth)/onboarding/_layout.jsx

import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: false, // linear wizard — no swipe-back skipping steps
      }}
    />
  );
}

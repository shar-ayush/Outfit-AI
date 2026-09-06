// app/(auth)/_layout.jsx
//
// No tab bar in this group (per folder plan: "(auth)/ — Auth group, no tab
// bar"). Each screen manages its own header (or none, for splash/welcome).

import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: '#F9F9F9' },
      }}
    />
  );
}

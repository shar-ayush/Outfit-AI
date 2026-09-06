// app/(app)/home/_layout.jsx
//
// Nested Stack under the Home tab — currently just the one index screen,
// but kept as its own Stack (per folder plan) so a future push screen
// (e.g. a full weather detail view) stays within the Home tab's own
// navigation history rather than escaping to the root stack.

import { Stack } from 'expo-router';

export default function HomeLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}

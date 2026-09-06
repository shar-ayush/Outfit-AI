// app/(app)/profile/_layout.jsx
//
// TEMPORARY — this is a placeholder so the Profile tab (already wired into
// app/(app)/_layout.jsx's Tabs navigator since Step 7) doesn't break when
// tapped. The real profile/analytics/preferences/wear-history/settings
// screens are built in Step 10 and will replace this file.

import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}

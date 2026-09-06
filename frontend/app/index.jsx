// app/index.jsx
//
// Entry route. Immediately hands off to the animated splash screen, which
// owns the actual auth-check + redirect logic (see (auth)/splash.jsx).
// Kept as a separate trivial redirect rather than folding splash logic in
// here directly, so the (auth) group's own Stack (fade transitions, etc.)
// applies to splash too.

import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/(auth)/splash" />;
}

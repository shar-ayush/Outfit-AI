// app/_layout.jsx
//
// Root layout — mounted once for the entire app. Order of providers matters:
//   GestureHandlerRootView must wrap everything (required by Reanimated /
//   Gesture Handler, especially on Android — without it, Swipeable and
//   any gesture-based component silently fails).
//   SafeAreaProvider must wrap anything using useSafeAreaInsets/SafeAreaView
//   (our Screen component uses this).
//   QueryClientProvider makes TanStack Query available to every hook.
//
// Auth bootstrapping (checkAuth) is NOT done here — it happens in
// app/(auth)/splash.jsx, which is the actual first route the user lands
// on (see app/index.jsx). This file only handles font loading and the
// native splash screen hold.

// FIX (gap #12): ErrorBoundary was entirely missing — an unexpected
// render error anywhere in the app previously crashed to a white screen
// with no recovery. Wrapped around everything below GestureHandlerRootView
// so it can catch errors from any screen.

import { useEffect } from 'react';
import { Slot } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { ToastHost, ErrorBoundary } from '@/components/common';
import queryClient from '@/api/queryClient';

// Keep the native splash screen visible until fonts are ready.
// Safely catch if preventAutoHideAsync fails or was already called.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  // Safety fallback: never keep the native splash screen visible indefinitely
  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <ToastHost />
            <Slot />
          </QueryClientProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Text from '@/components/common/Text';
import { useAuthStore } from '@/stores';

const MIN_VISIBLE_MS = 1100;

export default function SplashScreen() {
  const router = useRouter();
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();

    (async () => {
      try {
        const authTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Auth check timeout')), 2500)
        );
        await Promise.race([checkAuth(), authTimeout]);
      } catch (err) {
        console.warn('Auth check failed or timed out on splash:', err);
      } finally {
        const elapsed = Date.now() - startedAt;
        const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
        setTimeout(() => {
          if (cancelled) return;

          const { isAuthenticated: authed, user: currentUser } = useAuthStore.getState();

          if (!authed) {
            router.replace('/(auth)/welcome');
          } else if (!currentUser?.onboardingCompleted) {
            router.replace('/(auth)/onboarding/style-quiz');
          } else {
            router.replace('/(app)/home');
          }
        }, remaining);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.wordmark}>OUTFIT AI</Text>
      </View>
      <LoadingLine />
    </View>
  );
}

function LoadingLine() {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const width = 20 + progress.value * 80;
    const opacity = 0.15 + progress.value * 0.55;
    return { width, opacity };
  });

  return (
    <View style={styles.loadingWrap}>
      <Animated.View style={[styles.loadingLine, animatedStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontFamily: 'Inter_400Regular',
    fontSize: 32,
    color: '#F9F9F9',
    letterSpacing: -1.3,
  },
  loadingWrap: {
    position: 'absolute',
    bottom: 48,
    width: '100%',
    alignItems: 'center',
  },
  loadingLine: {
    height: 2,
    borderRadius: 1,
    backgroundColor: '#F9F9F9',
  },
});

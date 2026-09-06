// app/(auth)/welcome.jsx
//
// Matches welcome_screen/code.html: full-bleed editorial photo collage
// background, dark gradient overlay (for text legibility), brand + tagline
// near the top, two full-width CTAs pinned to the bottom.
//
// NOTE ON THE BACKGROUND IMAGE: the Stitch export references a Google-
// hosted AI-generated placeholder image (an editorial fashion collage).
// It's used here as-is since it's a real, reachable URL and matches the
// intended art direction exactly — swap `COLLAGE_IMAGE_URL` for your own
// production asset (bundled locally under assets/images/onboarding/ per
// the folder plan) before shipping.

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text from '@/components/common/Text';
import Button from '@/components/common/Button';
import { colors, spacing } from '@/theme';

const COLLAGE_IMAGE_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuANgDWdqNtUSyq8DSUr6f7j5jIf6xKqitrgIykapLZjB4ZQEAO8t12iD9NWLNEsy7CHnstQrtKz29JDoN-JK0Zo4IDFH_eEIEbvvhQKmsPnYUGdaBmSlxGuinv6WT2LEmKj2LVby2SxoXUTQqJEDwr0LkehkkY1qdgnkZXoyasoGHT4ocuxzvy6YxwWmo9ccaQ0pEj6CKeDxbA19Qd3RWCkB9SFKae48C3nCcgxul_R_6ZlLmRcmU4vEA';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <Image
        source={{ uri: COLLAGE_IMAGE_URL }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={400}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.75)']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.content}>
        <View style={styles.topSection}>
          <Text variant="displayLg" color="onPrimary" style={styles.wordmark}>
            OUTFIT AI
          </Text>
          <Text variant="bodyLg" color="surfaceVariant" style={styles.tagline}>
            Your personal AI stylist.
          </Text>
        </View>

        <View style={styles.actions}>
          <Button onPress={() => router.push('/(auth)/register')}>Get Started</Button>
          <Button variant="secondary" onPress={() => router.push('/(auth)/login')} style={styles.loginButton}>
            Login
          </Button>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter,
    paddingBottom: spacing.stackLg,
    paddingTop: 96,
  },
  topSection: { alignItems: 'center' },
  wordmark: { textAlign: 'center' },
  tagline: { marginTop: spacing.stackSm, textAlign: 'center' },
  actions: { width: '100%' },
  loginButton: { marginTop: spacing.stackMd },
});

// app/(auth)/login.jsx
//
// Matches login_screen/code.html: AuthHeader, "Welcome back" title, outlined
// email/password inputs, remember-me + forgot-password row, primary submit,
// sign-up footer link.

import React, { useEffect, useState } from 'react';
import { View, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Screen from '@/components/common/Screen';
import AuthHeader from '@/components/common/AuthHeader';
import Text from '@/components/common/Text';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import { useAuthStore, useUIStore } from '@/stores';
import { emailRules, loginPasswordRules } from '@/utils/validators';
import { getRememberedEmail, setRememberedEmail } from '@/utils/storage';
import { colors, spacing } from '@/theme';

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const showToast = useUIStore((s) => s.showToast);

  const [rememberMe, setRememberMe] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({ defaultValues: { email: '', password: '' } });

  useEffect(() => {
    (async () => {
      const remembered = await getRememberedEmail();
      if (remembered) {
        setValue('email', remembered);
        setRememberMe(true);
      }
    })();
  }, []);

  const onSubmit = async ({ email, password }) => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const user = await login({ email: email.trim(), password });
      await setRememberedEmail(rememberMe ? email.trim() : null);

      if (!user?.onboardingCompleted) {
        router.replace('/(auth)/onboarding/style-quiz');
      } else {
        router.replace('/(app)/home');
      }
    } catch (error) {
      const message = error?.response?.data?.message || 'Invalid email or password';
      setSubmitError(message);
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']} padded={false}>
      <AuthHeader />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.titleBlock}>
              <Text variant="displayLg" style={styles.title}>
                Welcome back
              </Text>
              <Text variant="bodyLg" color="secondary" style={styles.subtitle}>
                Log in to access your digital wardrobe.
              </Text>
            </View>

            <Controller
              control={control}
              name="email"
              rules={emailRules}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  variant="outlined"
                  placeholder="Email address"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.email?.message}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              rules={loginPasswordRules}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  variant="outlined"
                  placeholder="Password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                  secureTextEntry
                  autoComplete="current-password"
                  autoCorrect={false}
                />
              )}
            />

            {/* <View style={styles.optionsRow}>
              <Pressable style={styles.rememberRow} onPress={() => setRememberMe((v) => !v)}>
                <MaterialCommunityIcons
                  name={rememberMe ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={18}
                  color={rememberMe ? colors.primary : colors.secondary}
                />
                <Text variant="bodyMd" color="secondary" style={styles.rememberLabel}>
                  Remember me
                </Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  showToast('Password reset is coming soon — contact support for now.', 'info')
                }
              >
                <Text variant="bodyMd" style={styles.forgotLink}>
                  Forgot password?
                </Text>
              </Pressable>
            </View> */}

            {submitError && (
              <Text variant="bodyMd" color="error" style={styles.submitError}>
                {submitError}
              </Text>
            )}

            <Button onPress={handleSubmit(onSubmit)} loading={isSubmitting} style={styles.submitButton}>
              Log In
            </Button>

            <View style={styles.footer}>
              <Text variant="titleMd" color="secondary">
                New here?{' '}
              </Text>
              <Pressable onPress={() => router.push('/(auth)/register')}>
                <Text variant="titleMd">Create an account.</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.containerPadding,
    paddingVertical: spacing.stackLg,
  },
  content: {
    width: '100%',
  },
  titleBlock: { alignItems: 'center', marginBottom: spacing.stackLg },
  title: { textAlign: 'center' },
  subtitle: { marginTop: spacing.stackSm, textAlign: 'center' },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: spacing.stackMd,
  },
  rememberRow: { flexDirection: 'row', alignItems: 'center' },
  rememberLabel: { marginLeft: 8 },
  forgotLink: { fontFamily: 'Inter_600SemiBold' },
  submitError: { marginBottom: spacing.stackSm, textAlign: 'center' },
  submitButton: { marginTop: spacing.stackSm },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.stackLg,
  },
});

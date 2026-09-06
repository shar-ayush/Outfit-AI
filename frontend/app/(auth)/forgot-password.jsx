// app/(auth)/forgot-password.jsx
//
// Backed by the new POST /api/auth/forgot-password (backend fix #5).
// DEV-MODE NOTE: no email service exists in this backend, so the API
// response includes `devResetToken` directly. This screen shows it inline
// with a clearly-labeled "development mode" notice and a button straight
// to the reset screen - in production, remove `devResetToken` from the
// API response and this screen would just show a generic "check your
// email" message instead.

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import Screen from '@/components/common/Screen';
import AuthHeader from '@/components/common/AuthHeader';
import Text from '@/components/common/Text';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import { authApi } from '@/api';
import { emailRules } from '@/utils/validators';
import { spacing, radius } from '@/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { control, handleSubmit, formState: { errors } } = useForm({ defaultValues: { email: '' } });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [devToken, setDevToken] = useState(null);
  const [sent, setSent] = useState(false);

  const onSubmit = async ({ email }) => {
    setIsSubmitting(true);
    try {
      const result = await authApi.forgotPassword(email.trim());
      setSent(true);
      if (result.devResetToken) setDevToken(result.devResetToken);
    } catch {
      setSent(true); // backend intentionally never reveals whether the email exists
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']} padded={false}>
      <AuthHeader />
      <View style={styles.content}>
        <Text variant="displayLg" style={styles.title}>Reset your password</Text>
        <Text variant="bodyLg" color="secondary" style={styles.subtitle}>
          Enter your email and we'll send you a reset link.
        </Text>

        {!sent ? (
          <>
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
                />
              )}
            />
            <Button onPress={handleSubmit(onSubmit)} loading={isSubmitting}>
              Send Reset Link
            </Button>
          </>
        ) : (
          <View>
            <Text variant="bodyLg" style={styles.confirmText}>
              If that email exists, a reset link has been sent.
            </Text>

            {devToken && (
              <View style={styles.devBox}>
                <Text variant="labelCaps" color="error">DEVELOPMENT MODE</Text>
                <Text variant="bodyMd" color="secondary" style={styles.devText}>
                  No email service is configured on this backend, so here's the
                  reset token directly. Remove this in production.
                </Text>
                <Button
                  variant="secondary"
                  onPress={() => router.push({ pathname: '/(auth)/reset-password', params: { token: devToken } })}
                  style={styles.devButton}
                >
                  Continue to Reset
                </Button>
              </View>
            )}
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: spacing.containerPadding, justifyContent: 'center' },
  title: { marginBottom: spacing.stackSm },
  subtitle: { marginBottom: spacing.stackLg },
  confirmText: { marginBottom: spacing.stackLg },
  devBox: {
    backgroundColor: '#FBE4E2',
    borderRadius: radius.lg,
    padding: spacing.stackMd,
  },
  devText: { marginTop: spacing.stackSm, marginBottom: spacing.stackMd },
  devButton: {},
});
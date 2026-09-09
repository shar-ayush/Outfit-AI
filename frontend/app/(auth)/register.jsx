import React, { useState } from 'react';
import { View, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { useRouter } from 'expo-router';
import Screen from '@/components/common/Screen';
import AuthHeader from '@/components/common/AuthHeader';
import Text from '@/components/common/Text';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import ProgressBar from '@/components/common/ProgressBar';
import { useAuthStore, useUIStore } from '@/stores';
import { emailRules, usernameRules, passwordRules, calculatePasswordStrength } from '@/utils/validators';
import { spacing } from '@/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const showToast = useUIStore((s) => s.showToast);

  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({ defaultValues: { email: '', username: '', password: '' } });

  const passwordValue = watch('password');
  const strength = calculatePasswordStrength(passwordValue);

  const onSubmit = async ({ email, username, password }) => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await register({ email: email.trim(), username: username.trim(), password });
      router.replace('/(auth)/onboarding/style-quiz');
    } catch (error) {
      const message = error?.response?.data?.message || 'Could not create your account';
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
            <Text variant="displayLg">Create your account</Text>
            <Text variant="bodyMd" color="secondary" style={styles.subtitle}>
              Join the exclusive digital wardrobe.
            </Text>
          </View>

          <Controller
            control={control}
            name="email"
            rules={emailRules}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                variant="underline"
                label="Email"
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
            name="username"
            rules={usernameRules}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                variant="underline"
                label="Username"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.username?.message}
                autoCapitalize="none"
                autoComplete="username"
                autoCorrect={false}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            rules={passwordRules}
            render={({ field: { onChange, onBlur, value } }) => (
              <View>
                <Input
                  variant="underline"
                  label="Password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                  secureTextEntry
                  autoComplete="new-password"
                  autoCorrect={false}
                  containerStyle={styles.passwordInput}
                />
                {!!value && (
                  <View style={styles.strengthRow}>
                    <ProgressBar
                      progress={strength.ratio}
                      color={strength.color}
                      height={4}
                      style={styles.strengthBar}
                    />
                    <Text variant="labelCaps" color={strength.color}>
                      {strength.label}
                    </Text>
                  </View>
                )}
              </View>
            )}
          />

          {submitError && (
            <Text variant="bodyMd" color="error" style={styles.submitError}>
              {submitError}
            </Text>
          )}

          <Button onPress={handleSubmit(onSubmit)} loading={isSubmitting} style={styles.submitButton}>
            Sign Up
          </Button>

          <View style={styles.footer}>
            <Text variant="bodyMd" color="secondary">
              Already have an account?{' '}
            </Text>
            <Pressable onPress={() => router.push('/(auth)/login')}>
              <Text variant="bodyMd" style={styles.loginLink}>
                Log in
              </Text>
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
  titleBlock: { marginBottom: spacing.stackLg },
  subtitle: { marginTop: spacing.stackSm },
  passwordInput: { marginBottom: spacing.stackSm },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.stackMd,
  },
  strengthBar: { flex: 1, marginRight: spacing.stackSm },
  submitError: { marginBottom: spacing.stackSm, textAlign: 'center' },
  submitButton: { marginTop: spacing.stackMd },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.stackLg,
  },
  loginLink: { fontFamily: 'Inter_700Bold', textDecorationLine: 'underline' },
});

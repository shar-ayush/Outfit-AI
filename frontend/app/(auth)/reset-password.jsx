import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Screen from '@/components/common/Screen';
import AuthHeader from '@/components/common/AuthHeader';
import Text from '@/components/common/Text';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import { authApi } from '@/api';
import { useUIStore } from '@/stores';
import { spacing } from '@/theme';

export default function ResetPasswordScreen() {
  const { token: paramToken } = useLocalSearchParams();
  const router = useRouter();
  const showToast = useUIStore((s) => s.showToast);

  const [token, setToken] = useState(paramToken || '');
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    setError(null);
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setIsSubmitting(true);
    try {
      await authApi.resetPassword({ token, newPassword });
      showToast('Password reset — please log in', 'success');
      router.replace('/(auth)/login');
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not reset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']} padded={false}>
      <AuthHeader />
      <View style={styles.content}>
        <Text variant="displayLg" style={styles.title}>Set a new password</Text>

        <Input
          variant="outlined"
          placeholder="Reset token"
          value={token}
          onChangeText={setToken}
          autoCapitalize="none"
        />
        <Input
          variant="outlined"
          placeholder="New password"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
        />
        {error && (
          <Text variant="bodyMd" color="error" style={styles.error}>{error}</Text>
        )}
        <Button onPress={handleSubmit} loading={isSubmitting} disabled={!token || !newPassword}>
          Reset Password
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: spacing.containerPadding, justifyContent: 'center' },
  title: { marginBottom: spacing.stackLg },
  error: { marginBottom: spacing.stackMd, textAlign: 'center' },
});
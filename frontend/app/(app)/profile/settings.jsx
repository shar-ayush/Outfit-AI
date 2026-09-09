import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Screen from '@/components/common/Screen';
import Text from '@/components/common/Text';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import { useChangePassword, useDeleteAccount } from '@/hooks/useUser';
import { useClearAllSessions } from '@/hooks/useStylist';
import { useDeleteAllWearLogs } from '@/hooks/useWearLogs';
import { useAuthStore, useUIStore } from '@/stores';
import { exportWardrobeToJSON } from '@/utils/exportWardrobe';
import { colors, spacing, radius } from '@/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);
  const changePassword = useChangePassword();
  const deleteAccount = useDeleteAccount();
  const clearAllSessions = useClearAllSessions();
  const deleteAllWearLogs = useDeleteAllWearLogs();

  const [passwordFormOpen, setPasswordFormOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [clearSessionsModalOpen, setClearSessionsModalOpen] = useState(false);
  const [deleteLogsModalOpen, setDeleteLogsModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleChangePassword = () => {
    setPasswordError(null);
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          showToast('Password changed — please log in again', 'success');
          setPasswordFormOpen(false);
          setCurrentPassword('');
          setNewPassword('');
        },
        onError: (error) => {
          setPasswordError(error?.response?.data?.message || 'Could not change password');
        },
      }
    );
  };

  const handleDeleteAccount = () => {
    deleteAccount.mutate(deletePassword, {
      onSuccess: () => router.replace('/(auth)/welcome'),
      onError: () => showToast('Incorrect password', 'error'),
    });
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportWardrobeToJSON();
      showToast(`Exported ${result.itemCount} items`, 'success');
    } catch {
      showToast('Could not export wardrobe data', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearAllSessions = () => {
    clearAllSessions.mutate(undefined, {
      onSuccess: () => {
        showToast('All conversations cleared', 'success');
        setClearSessionsModalOpen(false);
      },
      onError: () => showToast('Could not clear conversations', 'error'),
    });
  };

  const handleDeleteAllWearLogs = () => {
    deleteAllWearLogs.mutate(undefined, {
      onSuccess: () => {
        showToast('All wear logs deleted', 'success');
        setDeleteLogsModalOpen(false);
      },
      onError: () => showToast('Could not delete wear logs', 'error'),
    });
  };

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.primary} />
        </Pressable>
        <Text variant="titleMd">Settings</Text>
        <View style={{ width: 22 }} />
      </View>

      <Text variant="labelCaps" color="secondary" style={styles.sectionLabel}>Account</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text variant="bodyLg" color="secondary">Email</Text>
          <Text variant="bodyLg">{user?.email}</Text>
        </View>

        <Pressable style={styles.row} onPress={() => setPasswordFormOpen((v) => !v)}>
          <Text variant="bodyLg">Change Password</Text>
          <MaterialCommunityIcons
            name={passwordFormOpen ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.onSurfaceVariant}
          />
        </Pressable>

        {passwordFormOpen && (
          <View style={styles.passwordForm}>
            <Input
              variant="outlined"
              placeholder="Current password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
            />
            <Input
              variant="outlined"
              placeholder="New password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            {passwordError && (
              <Text variant="bodyMd" color="error" style={styles.errorText}>{passwordError}</Text>
            )}
            <Button
              onPress={handleChangePassword}
              loading={changePassword.isPending}
              disabled={!currentPassword || !newPassword}
            >
              Update Password
            </Button>
          </View>
        )}
      </View>

      <Text variant="labelCaps" color="secondary" style={styles.sectionLabel}>Data</Text>
      <View style={styles.card}>
        <Pressable style={styles.row} onPress={handleExport} disabled={isExporting}>
          <Text variant="bodyLg">Export Wardrobe Data</Text>
          {isExporting ? (
            <MaterialCommunityIcons name="loading" size={18} color={colors.secondary} />
          ) : (
            <MaterialCommunityIcons name="tray-arrow-down" size={18} color={colors.onSurfaceVariant} />
          )}
        </Pressable>
        <Pressable style={styles.row} onPress={() => setClearSessionsModalOpen(true)}>
          <Text variant="bodyLg">Clear Conversation History</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={colors.onSurfaceVariant} />
        </Pressable>
        <Pressable style={styles.row} onPress={() => setDeleteLogsModalOpen(true)}>
          <Text variant="bodyLg" color="error">Delete All Wear Logs</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={colors.error} />
        </Pressable>
      </View>

      <Text variant="labelCaps" color="secondary" style={styles.sectionLabel}>Danger Zone</Text>
      <View style={styles.card}>
        <Pressable style={styles.row} onPress={() => setDeleteModalOpen(true)}>
          <Text variant="bodyLg" color="error">Delete Account</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.error} />
        </Pressable>
      </View>

      <Text variant="caption" color="secondary" style={styles.version}>
        Outfit AI · v1.0.0
      </Text>

      <Modal visible={deleteModalOpen} onRequestClose={() => setDeleteModalOpen(false)}>
        <Text variant="titleMd">Delete your account?</Text>
        <Text variant="bodyMd" color="secondary" style={styles.modalDescription}>
          This permanently deletes your wardrobe, outfits, and history. This cannot be undone.
        </Text>
        <Input
          variant="outlined"
          placeholder="Confirm your password"
          value={deletePassword}
          onChangeText={setDeletePassword}
          secureTextEntry
          containerStyle={styles.deleteInput}
        />
        <View style={styles.modalActions}>
          <Button variant="secondary" onPress={() => setDeleteModalOpen(false)} style={styles.modalButton}>
            Cancel
          </Button>
          <Button
            onPress={handleDeleteAccount}
            loading={deleteAccount.isPending}
            disabled={!deletePassword}
            style={styles.modalButton}
          >
            Delete
          </Button>
        </View>
      </Modal>

      <Modal visible={clearSessionsModalOpen} onRequestClose={() => setClearSessionsModalOpen(false)}>
        <Text variant="titleMd">Clear all conversations?</Text>
        <Text variant="bodyMd" color="secondary" style={styles.modalDescription}>
          This permanently deletes every stylist chat session. This cannot be undone.
        </Text>
        <View style={styles.modalActions}>
          <Button variant="secondary" onPress={() => setClearSessionsModalOpen(false)} style={styles.modalButton}>
            Cancel
          </Button>
          <Button onPress={handleClearAllSessions} loading={clearAllSessions.isPending} style={styles.modalButton}>
            Clear All
          </Button>
        </View>
      </Modal>

      <Modal visible={deleteLogsModalOpen} onRequestClose={() => setDeleteLogsModalOpen(false)}>
        <Text variant="titleMd">Delete all wear logs?</Text>
        <Text variant="bodyMd" color="secondary" style={styles.modalDescription}>
          This permanently deletes your entire wear history. Your wardrobe and outfits are unaffected. This cannot be undone.
        </Text>
        <View style={styles.modalActions}>
          <Button variant="secondary" onPress={() => setDeleteLogsModalOpen(false)} style={styles.modalButton}>
            Cancel
          </Button>
          <Button onPress={handleDeleteAllWearLogs} loading={deleteAllWearLogs.isPending} style={styles.modalButton}>
            Delete All
          </Button>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.stackSm,
    marginBottom: spacing.stackLg,
  },
  sectionLabel: { marginBottom: spacing.stackSm },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.lg,
    marginBottom: spacing.stackXl,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.stackMd,
    paddingVertical: spacing.stackMd,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHigh,
  },
  passwordForm: { padding: spacing.stackMd, gap: spacing.stackSm },
  errorText: { marginBottom: spacing.stackSm },
  version: { textAlign: 'center', marginBottom: spacing.stackXl },
  modalDescription: { marginTop: spacing.stackSm, marginBottom: spacing.stackMd },
  deleteInput: { marginBottom: spacing.stackMd },
  modalActions: { flexDirection: 'row', gap: spacing.stackSm },
  modalButton: { flex: 1 },
});
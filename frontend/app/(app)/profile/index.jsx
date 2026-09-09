import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Screen from '@/components/common/Screen';
import Text from '@/components/common/Text';
import Avatar from '@/components/common/Avatar';
import Divider from '@/components/common/Divider';
import { useAuthStore } from '@/stores';
import { colors, spacing, radius } from '@/theme';

const NAV_ITEMS = [
  { key: 'analytics', icon: 'chart-line', label: 'Analytics & ROI', route: '/(app)/profile/analytics' },
  { key: 'preferences', icon: 'creation', label: 'My Style Profile', route: '/(app)/profile/preferences' },
  { key: 'wear-history', icon: 'calendar-check-outline', label: 'Wear History', route: '/(app)/profile/wear-history' },
  { key: 'settings', icon: 'cog-outline', label: 'Settings', route: '/(app)/profile/settings' },
];

function styleProfileSummary(styleProfile) {
  if (!styleProfile) return null;
  const parts = [];
  if (styleProfile.preferredStyles?.length) parts.push(styleProfile.preferredStyles.slice(0, 2).join(' · '));
  if (styleProfile.climate) parts.push(`${styleProfile.climate} climate`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

export default function ProfileHomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const summary = styleProfileSummary(user?.styleProfile);

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Avatar name={user?.username} size={64} />
        <View style={styles.headerText}>
          <Text variant="displayMd">{user?.username}</Text>
          {summary && (
            <Text variant="bodyMd" color="secondary" style={styles.summary}>
              {summary}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.navList}>
        {NAV_ITEMS.map((item, i) => (
          <React.Fragment key={item.key}>
            <Pressable style={styles.navRow} onPress={() => router.push(item.route)}>
              <MaterialCommunityIcons name={item.icon} size={20} color={colors.onSurface} style={styles.navIcon} />
              <Text variant="bodyLg" style={styles.navLabel}>{item.label}</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={colors.secondary} />
            </Pressable>
            {i < NAV_ITEMS.length - 1 && <Divider inset />}
          </React.Fragment>
        ))}
      </View>

      <Pressable style={styles.logoutRow} onPress={logout}>
        <MaterialCommunityIcons name="logout" size={18} color={colors.error} />
        <Text variant="bodyLg" color="error" style={styles.logoutLabel}>Log Out</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.stackMd, marginBottom: spacing.stackXl },
  headerText: { marginLeft: spacing.stackMd, flex: 1 },
  summary: { marginTop: 4, textTransform: 'capitalize' },
  navList: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.lg,
    marginBottom: spacing.stackXl,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.stackMd,
    paddingVertical: spacing.stackMd,
  },
  navIcon: { marginRight: spacing.stackMd },
  navLabel: { flex: 1 },
  logoutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.stackMd },
  logoutLabel: { marginLeft: spacing.stackSm },
});

// app/(app)/stylist/sessions.jsx

import React from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Screen from '@/components/common/Screen';
import Text from '@/components/common/Text';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorState from '@/components/common/ErrorState';
import EmptyState from '@/components/common/EmptyState';
import { SessionPreview } from '@/components/chat';
import { useSessions } from '@/hooks/useStylist';
import { spacing } from '@/theme';

export default function StylistSessionsScreen() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useSessions();

  const sessions = data?.sessions || [];

  return (
    <Screen edges={['top', 'bottom']} padded={false}>
      <View style={styles.header}>
        <Text variant="displayMd">Past Conversations</Text>
      </View>

      {isLoading ? (
        <LoadingSpinner fullScreen />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : sessions.length === 0 ? (
        <EmptyState
          icon="creation"
          title="No conversations yet"
          description="Start chatting with your stylist to see past sessions here."
        />
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <SessionPreview
              session={item}
              onPress={() => router.push({ pathname: '/(app)/stylist', params: { sessionId: item._id } })}
            />
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.gutter, paddingVertical: spacing.stackMd },
  list: { paddingHorizontal: spacing.gutter },
});

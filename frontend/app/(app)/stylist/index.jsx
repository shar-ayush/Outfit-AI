// app/(app)/stylist/index.jsx
//
// The centerpiece screen - wired directly to POST /api/stylist/chat, which
// internally branches into two real, distinct response shapes
// (stylistService.classifyMessage): a fashion QUESTION gets a plain-text
// Gemini answer (`type: 'text'`), an OUTFIT REQUEST runs the full hybrid-
// retrieval -> compatibility-scoring -> personalization -> novelty ->
// LLM-re-rank pipeline (`type: 'outfits'`). This screen renders both
// shapes distinctly rather than assuming every message returns cards.
//
// PERSONALIZATION BADGE: derived from the real `user.learningPhase`
// (0/1/2) using the exact same weight table as
// backend/src/services/recommendation/personalizationService.js
// (applyPersonalization's [0.15, 0.30, 0.40]) - so "30% personalized"
// in the header is not a made-up number, it's the actual blend ratio the
// backend is using for this user right now.

import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text from '@/components/common/Text';
import {
  ChatBubble,
  ChatOutfitCard,
  ChatInput,
  ChatSuggestions,
  TypingIndicator,
  IntentChip,
} from '@/components/chat';
import { useSendStylistMessage, useSession } from '@/hooks/useStylist';
import { useOutfitAction } from '@/hooks/useOutfits';
import { useAuthStore, useStylistStore, useUIStore } from '@/stores';
import { colors, spacing } from '@/theme';

const PERSONALIZATION_WEIGHTS = [15, 30, 40]; // matches backend's [0.15, 0.30, 0.40] exactly

export default function StylistChatScreen() {
  const router = useRouter();
  const { sessionId: resumeSessionId } = useLocalSearchParams();
  const showToast = useUIStore((s) => s.showToast);
  const user = useAuthStore((s) => s.user);

  const {
    activeSessionId, messages, isTyping,
    setSession, loadMessages, addMessage, setTyping, clearSession,
  } = useStylistStore();

  const sendMessage = useSendStylistMessage();
  const outfitAction = useOutfitAction();
  const { data: resumedSession } = useSession(resumeSessionId);

  const [outfitActionLoading, setOutfitActionLoading] = useState({});
  const scrollRef = useRef(null);

  useEffect(() => {
    if (resumedSession) {
      setSession(resumedSession._id);
      loadMessages(resumedSession.messages);
    }
  }, [resumedSession]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

  const handleSend = (text) => {
    addMessage({ role: 'user', content: text });
    setTyping(true);
    scrollToBottom();

    sendMessage.mutate(
      { message: text, sessionId: activeSessionId },
      {
        onSuccess: (result) => {
          setSession(result.sessionId);
          if (result.type === 'outfits') {
            addMessage({
              role: 'assistant',
              type: 'outfits',
              content: result.message,
              outfits: result.outfits,
              intent: result.intent,
            });
          } else {
            addMessage({ role: 'assistant', type: 'text', content: result.message });
          }
          scrollToBottom();
        },
        onError: () => {
          showToast('The stylist is unavailable right now', 'error');
        },
        onSettled: () => setTyping(false),
      }
    );
  };

  const handleOutfitAction = (outfit, action) => {
    const outfitId = (outfit.outfitId || outfit._id)?.toString();
    if (!outfitId) return;
    setOutfitActionLoading((prev) => ({ ...prev, [outfitId]: action }));
    outfitAction.mutate(
      { outfitId, action, recommendationId: outfit.recommendationId },
      {
        onSuccess: () => {
          const labels = { worn: 'Marked as worn', saved: 'Outfit saved', skipped: 'Skipped' };
          showToast(labels[action] || 'Updated', 'success');
        },
        onError: () => showToast('Could not update this outfit', 'error'),
        onSettled: () =>
          setOutfitActionLoading((prev) => {
            const next = { ...prev };
            delete next[outfitId];
            return next;
          }),
      }
    );
  };

  const learningPhase = user?.learningPhase ?? 0;
  const personalizationPercent = PERSONALIZATION_WEIGHTS[learningPhase];

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View>
          <Text variant="titleMd">Stylist</Text>
          <Text variant="caption" color="secondary">
            Phase {learningPhase} - {personalizationPercent}% personalized to you
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.iconButton} onPress={clearSession}>
            <MaterialCommunityIcons name="plus-circle-outline" size={22} color={colors.onSurface} />
          </Pressable>
          <Pressable style={styles.iconButton} onPress={() => router.push('/(app)/stylist/sessions')}>
            <MaterialCommunityIcons name="history" size={22} color={colors.onSurface} />
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="creation" size={36} color={colors.goldAccent} style={styles.emptyIcon} />
            <Text variant="headlineSm" style={styles.emptyTitle}>
              What are you dressing for today?
            </Text>
            <ChatSuggestions onSelect={handleSend} />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={scrollToBottom}
          >
            {messages.map((message, i) => {
              if (message.type === 'outfits') {
                return (
                  <View key={i} style={styles.outfitMessageGroup}>
                    <IntentChip intent={message.intent} />
                    {!!message.content && (
                      <Text variant="bodyMd" color="secondary" style={styles.outfitIntro}>
                        {message.content}
                      </Text>
                    )}
                    {(message.outfits || []).map((outfit, outfitIdx) => {
                      const outfitId = (outfit?.outfitId || outfit?._id)?.toString() || `outfit-${i}-${outfitIdx}`;
                      return (
                        <ChatOutfitCard
                          key={outfitId}
                          outfit={outfit}
                          actionLoading={outfitActionLoading[outfitId]}
                          onAction={(action) => handleOutfitAction(outfit, action)}
                        />
                      );
                    })}
                  </View>
                );
              }
              return <ChatBubble key={i} role={message.role} content={message.content} />;
            })}
            {isTyping && <TypingIndicator />}
          </ScrollView>
        )}

        <ChatInput onSend={handleSend} disabled={isTyping} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.stackSm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHigh,
  },
  headerActions: { flexDirection: 'row', gap: spacing.stackSm },
  iconButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.gutter },
  emptyIcon: { marginBottom: spacing.stackMd },
  emptyTitle: { textAlign: 'center', marginBottom: spacing.stackLg },
  messagesContent: { padding: spacing.gutter },
  outfitMessageGroup: { marginBottom: spacing.stackMd },
  outfitIntro: { marginBottom: spacing.stackMd },
});

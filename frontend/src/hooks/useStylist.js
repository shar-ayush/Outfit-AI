// src/hooks/useStylist.js
//
// BACKEND-GROUNDED DESIGN NOTE:
// ConversationSession.messages only stores { role, content, outfitIds }
// (see backend/src/models/ConversationSession.js) — NOT full outfit
// objects. So resuming a past session from the Sessions list can't just
// render outfit cards from message.outfitIds directly; we have to fetch
// each outfit by id via GET /outfits/:outfitId (a real, existing endpoint)
// and attach the hydrated outfit objects before rendering. This is more
// work than trusting a shortcut, but it's the only way to show real data
// instead of guessing.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { stylistApi, outfitsApi } from '@/api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export function useSendStylistMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: stylistApi.sendChatMessage,
    onSuccess: (result) => {
      if (result?.dailyUpdated || result?.type === 'outfits') {
        queryClient.invalidateQueries({ queryKey: ['outfits', 'daily'] });
      }
    },
  });
}

export function useSessions(page = 1) {
  return useQuery({
    queryKey: QUERY_KEYS.SESSIONS(page),
    queryFn: () => stylistApi.getSessions({ page }),
  });
}

async function hydrateSessionMessages(session) {
  if (!session?.messages) return session;
  const messagesWithOutfits = await Promise.all(
    session.messages.map(async (message) => {
      if (!message.outfitIds || message.outfitIds.length === 0) return message;
      try {
        const outfits = (
          await Promise.all(
            message.outfitIds.map(async (item) => {
              if (item && typeof item === 'object' && item.items) {
                return item;
              }
              const id = (item?._id || item?.outfitId || item)?.toString();
              if (!id) return null;
              return outfitsApi.getOutfitById(id);
            })
          )
        )
          .filter(Boolean)
          .map((outfit) => {
            const outfitId = (outfit.outfitId || outfit._id)?.toString();
            const items = (outfit.items || []).map((it) => {
              const cloth = it?.clothId && typeof it.clothId === 'object' ? it.clothId : it;
              return {
                ...cloth,
                _id: (cloth?._id || it?._id)?.toString(),
                imageUrl: cloth?.imageUrl || it?.imageUrl,
                category: cloth?.category || it?.category,
                subCategory: cloth?.subCategory || it?.subCategory,
                color: cloth?.color || it?.color,
                style: cloth?.style || it?.style,
                formality: cloth?.formality || it?.formality,
              };
            });
            return {
              ...outfit,
              outfitId,
              _id: outfitId,
              isSaved: Boolean(outfit.isSaved),
              items,
            };
          });

        return { ...message, type: 'outfits', outfits };
      } catch {
        // If an outfit was since deleted/archived, degrade gracefully —
        // show the text content without cards rather than failing the
        // whole session load.
        return message;
      }
    })
  );
  return { ...session, messages: messagesWithOutfits };
}

export function useSession(sessionId) {
  return useQuery({
    queryKey: QUERY_KEYS.SESSION(sessionId),
    queryFn: async () => {
      const session = await stylistApi.getSession(sessionId);
      return hydrateSessionMessages(session);
    },
    enabled: !!sessionId,
  });
}

export function useClearSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: stylistApi.clearSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stylist', 'sessions'] });
    },
  });
}

// NEW (backend fix #4) — Settings' "Clear All Conversations".
export function useClearAllSessions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: stylistApi.clearAllSessions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stylist', 'sessions'] });
    },
  });
}
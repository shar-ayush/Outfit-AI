// src/api/outfits.js
//
// Maps 1:1 to backend/src/routes/outfits.js

import apiClient from './client';

export async function suggestOutfits({ query, sessionId = null, count = 3, weatherContext = null }) {
  const { data } = await apiClient.post('/outfits/suggest', {
    query,
    sessionId,
    count,
    weatherContext,
  });
  return data.data; // { outfits, sessionId, intent, meta } or { outfits: [], message }
}

// action: 'worn' | 'saved' | 'rejected' | 'skipped' | 'shared' | 'rated'
export async function recordOutfitAction(outfitId, { action, recommendationId, rating, feedback, context }) {
  const { data } = await apiClient.post(`/outfits/${outfitId}/action`, {
    action,
    recommendationId,
    rating,
    feedback,
    context,
  });
  return data.data;
}

export async function getSavedOutfits(params = {}) {
  const { data } = await apiClient.get('/outfits/saved', { params });
  return data.data; // { outfits, pagination }
}

export async function createOutfit(payload) {
  const { data } = await apiClient.post('/outfits', payload);
  return data.data.outfit;
}

export async function getOutfitById(outfitId) {
  const { data } = await apiClient.get(`/outfits/${outfitId}`);
  return data.data.outfit;
}

// NEW (backend fix #2) — previously the Recommendation document
// (algorithm/personalization/novelty score breakdown) was written on
// every suggestion but had no route to read it back. Returns null for
// user-created outfits that were never suggested.
export async function getRecommendationForOutfit(outfitId) {
  const { data } = await apiClient.get(`/outfits/${outfitId}/recommendation`);
  return data.data.recommendation;
}

export async function deleteOutfit(outfitId) {
  const { data } = await apiClient.delete(`/outfits/${outfitId}`);
  return data.data;
}
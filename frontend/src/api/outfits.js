import apiClient from './client';

export async function suggestOutfits({ query, sessionId = null, count = 3, weatherContext = null }) {
  const { data } = await apiClient.post('/outfits/suggest', {
    query,
    sessionId,
    count,
    weatherContext,
  });
  return data.data;
}

export async function getDailyOutfit({ date, weatherContext = null }) {
  const params = { date };
  if (weatherContext && weatherContext.temperature !== undefined) {
    params.temperature = weatherContext.temperature;
    params.condition = weatherContext.condition;
  }
  const { data } = await apiClient.get('/outfits/daily', { params });
  return data.data;
}

export async function refreshDailyOutfit({ date, weatherContext = null, reason = null }) {
  const { data } = await apiClient.post('/outfits/daily/refresh', {
    date,
    weatherContext,
    reason,
  });
  return data.data;
}

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
  return data.data;
}

export async function createOutfit(payload) {
  const { data } = await apiClient.post('/outfits', payload);
  return data.data.outfit;
}

export async function getOutfitById(outfitId) {
  const { data } = await apiClient.get(`/outfits/${outfitId}`);
  return data.data.outfit;
}

export async function getRecommendationForOutfit(outfitId) {
  const { data } = await apiClient.get(`/outfits/${outfitId}/recommendation`);
  return data.data.recommendation;
}

export async function deleteOutfit(outfitId, { permanent = false } = {}) {
  const { data } = await apiClient.delete(
    permanent ? `/outfits/${outfitId}/permanent` : `/outfits/${outfitId}`
  );
  return data.data;
}
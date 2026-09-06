// src/api/wearLogs.js
//
// Maps 1:1 to backend/src/routes/wearLogs.js

import apiClient from './client';

export async function logWear({ outfitId, occasion, rating, feedback, temperature, condition, recommendationId }) {
  const { data } = await apiClient.post('/wear-logs', {
    outfitId,
    occasion,
    rating,
    feedback,
    temperature,
    condition,
    recommendationId,
  });
  return data.data.wearLog;
}

export async function getWearHistory(params = {}) {
  const { data } = await apiClient.get('/wear-logs', { params });
  return data.data; // { logs, pagination }
}

// NEW (backend fix #6) — deleteAllWearLogs pairs with the bulk-delete
// endpoint added to Settings.
export async function deleteAllWearLogs() {
  const { data } = await apiClient.delete('/wear-logs');
  return data.data;
}

export async function getWearLog(logId) {
  const { data } = await apiClient.get(`/wear-logs/${logId}`);
  return data.data.log;
}

export async function deleteWearLog(logId) {
  const { data } = await apiClient.delete(`/wear-logs/${logId}`);
  return data.data;
}
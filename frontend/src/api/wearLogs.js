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
  return data.data;
}

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
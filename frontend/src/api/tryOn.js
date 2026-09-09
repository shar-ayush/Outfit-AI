import apiClient from './client';

export async function performTryOn({
  personAsset,
  personUrl,
  apparelAsset,
  apparelUrl,
  clothId,
  prompt,
}) {
  const formData = new FormData();

  if (personAsset?.uri) {
    formData.append('personImage', {
      uri: personAsset.uri,
      name: personAsset.fileName || `person_${Date.now()}.jpg`,
      type: personAsset.mimeType || 'image/jpeg',
    });
  } else if (personUrl) {
    formData.append('personUrl', personUrl);
  }

  if (clothId) {
    formData.append('clothId', clothId);
  } else if (apparelAsset?.uri) {
    formData.append('apparelImage', {
      uri: apparelAsset.uri,
      name: apparelAsset.fileName || `apparel_${Date.now()}.jpg`,
      type: apparelAsset.mimeType || 'image/jpeg',
    });
  } else if (apparelUrl) {
    formData.append('apparelUrl', apparelUrl);
  }

  if (prompt && prompt.trim()) {
    formData.append('prompt', prompt.trim());
  }

  const { data } = await apiClient.post('/try-on', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 75000,
  });

  return data.data;
}

export async function fetchTryOnHistory(page = 1, limit = 20) {
  const { data } = await apiClient.get('/try-on/history', {
    params: { page, limit },
  });
  return data.data;
}

export async function deleteTryOnItem(id) {
  const { data } = await apiClient.delete(`/try-on/${id}`);
  return data.data;
}

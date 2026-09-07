// src/api/tryOn.js
//
// Virtual Try-On API client calls
// Endpoint: /api/try-on

import apiClient from './client';

/**
 * Execute Virtual Try-On
 * 
 * @param {Object} params
 * @param {Object} [params.personAsset] - { uri, fileName?, mimeType? } from expo-image-picker
 * @param {string} [params.personUrl] - Public URL of person photo
 * @param {Object} [params.apparelAsset] - { uri, fileName?, mimeType? } from expo-image-picker
 * @param {string} [params.apparelUrl] - Public URL of apparel photo
 * @param {string} [params.clothId] - Mongo ID of a wardrobe cloth item
 * @param {string} [params.prompt] - Optional prompt for styling/environment
 * @returns {Promise<Object>} The generated TryOnResult document
 */
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
    timeout: 75000, // Generation takes 15-30s
  });

  return data.data;
}

/**
 * Fetch user's try-on history
 * 
 * @param {number} page
 * @param {number} limit
 * @returns {Promise<Object>} { results, pagination }
 */
export async function fetchTryOnHistory(page = 1, limit = 20) {
  const { data } = await apiClient.get('/try-on/history', {
    params: { page, limit },
  });
  return data.data;
}

/**
 * Delete a saved try-on result
 * 
 * @param {string} id
 */
export async function deleteTryOnItem(id) {
  const { data } = await apiClient.delete(`/try-on/${id}`);
  return data.data;
}

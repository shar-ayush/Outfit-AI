// src/api/wardrobe.js
//
// Maps 1:1 to backend/src/routes/wardrobe.js
//
// Upload endpoints use multipart/form-data — built via native FormData.
// On React Native, a file field needs { uri, name, type } rather than a
// Blob/File object (that's a web-only API).

import apiClient from './client';

// ─────────────────────────────────────────────
// Upload single item
// asset: { uri, fileName?, mimeType? } — shape returned by expo-image-picker
// extra: { purchasePrice?, purchaseCurrency?, purchaseDate?, brand?, name?, notes? }
// ─────────────────────────────────────────────

export async function uploadCloth(asset, extra = {}) {
  const formData = new FormData();

  formData.append('image', {
    uri: asset.uri,
    name: asset.fileName || `upload_${Date.now()}.jpg`,
    type: asset.mimeType || 'image/jpeg',
  });

  Object.entries(extra).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      formData.append(key, String(value));
    }
  });

  const { data } = await apiClient.post('/wardrobe/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data.cloth;
}

// ─────────────────────────────────────────────
// Bulk upload — up to 20 assets
// ─────────────────────────────────────────────

export async function uploadBulkClothes(assets) {
  const formData = new FormData();

  assets.forEach((asset, i) => {
    formData.append('images', {
      uri: asset.uri,
      name: asset.fileName || `upload_${Date.now()}_${i}.jpg`,
      type: asset.mimeType || 'image/jpeg',
    });
  });

  const { data } = await apiClient.post('/wardrobe/upload/bulk', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data; // { uploaded, failed, items, errors }
}

// ─────────────────────────────────────────────
// Wardrobe CRUD
// ─────────────────────────────────────────────

export async function getWardrobe(params = {}) {
  const { data } = await apiClient.get('/wardrobe', { params });
  return data.data; // { clothes, pagination }
}

export async function getClothById(clothId) {
  const { data } = await apiClient.get(`/wardrobe/${clothId}`);
  return data.data.cloth;
}

export async function updateCloth(clothId, updateData) {
  const { data } = await apiClient.patch(`/wardrobe/${clothId}`, updateData);
  return data.data.cloth;
}

export async function toggleAvailability(clothId) {
  const { data } = await apiClient.patch(`/wardrobe/${clothId}/availability`);
  return data.data; // { clothId, isAvailable }
}

export async function archiveCloth(clothId) {
  const { data } = await apiClient.delete(`/wardrobe/${clothId}`);
  return data.data;
}

export async function permanentDeleteCloth(clothId) {
  const { data } = await apiClient.delete(`/wardrobe/${clothId}/permanent`);
  return data.data;
}

export async function getWardrobeStats() {
  const { data } = await apiClient.get('/wardrobe/stats');
  return data.data.stats;
}

import apiClient from './client';

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
  return data.data;
}

export async function getWardrobe(params = {}) {
  const { data } = await apiClient.get('/wardrobe', { params });
  return data.data;
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
  return data.data;
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

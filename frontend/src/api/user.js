import apiClient from './client';

export async function getProfile() {
  const { data } = await apiClient.get('/user/profile');
  return data.data.user;
}

export async function updateProfile({ username, gender }) {
  const { data } = await apiClient.patch('/user/profile', { username, gender });
  return data.data.user;
}

export async function completeOnboarding({ preferredStyles, preferredColors, preferredFormality, climate }) {
  const { data } = await apiClient.post('/user/onboarding', {
    preferredStyles,
    preferredColors,
    preferredFormality,
    climate,
  });
  return data.data.user;
}

export async function changePassword({ currentPassword, newPassword }) {
  const { data } = await apiClient.post('/user/change-password', { currentPassword, newPassword });
  return data.data;
}

export async function getPreferences() {
  const { data } = await apiClient.get('/user/preferences');
  return data.data;
}

export async function deleteAccount(password) {
  const { data } = await apiClient.delete('/user/account', { data: { password } });
  return data.data;
}

// src/api/auth.js
//
// Maps 1:1 to backend/src/routes/auth.js

import apiClient from './client';

export async function register({ email, password, username, gender }) {
  const { data } = await apiClient.post('/auth/register', { email, password, username, gender });
  return data.data; // { user, accessToken, refreshToken }
}

export async function login({ email, password }) {
  const { data } = await apiClient.post('/auth/login', { email, password });
  return data.data; // { user, accessToken, refreshToken }
}

export async function refreshToken(token) {
  const { data } = await apiClient.post('/auth/refresh', { refreshToken: token });
  return data.data; // { accessToken, refreshToken }
}

export async function logout(refreshTokenValue) {
  const { data } = await apiClient.post('/auth/logout', { refreshToken: refreshTokenValue });
  return data.data;
}

export async function logoutAll() {
  const { data } = await apiClient.post('/auth/logout-all');
  return data.data;
}

export async function getMe() {
  const { data } = await apiClient.get('/auth/me');
  return data.data.user;
}

// NEW (backend fix #5) — dev-mode returns the reset token directly since
// no email service is wired up; see forgot-password.jsx for how that's
// surfaced to the user.
export async function forgotPassword(email) {
  const { data } = await apiClient.post('/auth/forgot-password', { email });
  return data.data; // { message, devResetToken? }
}

export async function resetPassword({ token, newPassword }) {
  const { data } = await apiClient.post('/auth/reset-password', { token, newPassword });
  return data.data;
}
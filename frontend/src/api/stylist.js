// src/api/stylist.js
//
// Maps 1:1 to backend/src/routes/stylist.js

import apiClient from './client';

export async function sendChatMessage({ message, sessionId = null, weatherContext = null }) {
  const { data } = await apiClient.post(
    '/stylist/chat',
    { message, sessionId, weatherContext },
    {
      timeout: 60000, // AI outfit generation + intent extraction can take up to 45s under high load
    }
  );
  return data.data; // { type: 'outfits'|'text', outfits, message, sessionId, intent }
}

export async function getSession(sessionId) {
  const { data } = await apiClient.get(`/stylist/sessions/${sessionId}`);
  return data.data.session;
}

export async function getSessions(params = {}) {
  const { data } = await apiClient.get('/stylist/sessions', { params });
  return data.data; // { sessions, pagination }
}

export async function clearSession(sessionId) {
  const { data } = await apiClient.delete(`/stylist/sessions/${sessionId}`);
  return data.data;
}

// NEW — pairs with the bulk-delete backend endpoint added for gap #4.
export async function clearAllSessions() {
  const { data } = await apiClient.delete('/stylist/sessions');
  return data.data;
}
import apiClient from './client';

export async function sendChatMessage({ message, sessionId = null, weatherContext = null }) {
  const { data } = await apiClient.post(
    '/stylist/chat',
    { message, sessionId, weatherContext },
    {
      timeout: 60000,
    }
  );
  return data.data;
}

export async function getSession(sessionId) {
  const { data } = await apiClient.get(`/stylist/sessions/${sessionId}`);
  return data.data.session;
}

export async function getSessions(params = {}) {
  const { data } = await apiClient.get('/stylist/sessions', { params });
  return data.data;
}

export async function clearSession(sessionId) {
  const { data } = await apiClient.delete(`/stylist/sessions/${sessionId}`);
  return data.data;
}

export async function clearAllSessions() {
  const { data } = await apiClient.delete('/stylist/sessions');
  return data.data;
}
// src/api/client.js
//
// Central Axios instance. Design notes on why it's structured this way:
//
// The access token is held in a module-level variable here (not read from
// authStore) to avoid a circular import: authStore.js calls into
// api/auth.js, which calls this client, which would otherwise need to
// import authStore to read the token — a cycle. Instead, authStore SETS
// the token here via setAccessToken() whenever it changes, and this module
// owns reading it for the request interceptor.
//
// Token refresh on 401 is done with a RAW axios call (not `apiClient`)
// to avoid re-triggering this same interceptor and looping forever.
//
// authStore registers itself via registerAuthFailureHandler() so that when
// refresh ultimately fails (refresh token expired/invalid), this module can
// tell authStore to log the user out — again without importing authStore
// directly.

import axios from 'axios';
import { getRefreshToken, setRefreshToken, clearRefreshToken } from '@/utils/storage';
import { uiStore } from '@/stores/uiStore';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

// ── In-memory access token ─────────────────────────────────────

let accessToken = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

// ── Auth-failure hook (wired by authStore) ──────────────────────

let authFailureHandler = null;

export function registerAuthFailureHandler(fn) {
  authFailureHandler = fn;
}

// ── Request interceptor — attach bearer token ────────────────────

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ── Refresh-token queueing ────────────────────────────────────────
// If multiple requests 401 simultaneously, only refresh once — queue
// the rest and resolve them all when the single refresh completes.

let isRefreshing = false;
let refreshQueue = []; // [{ resolve, reject }]

function processQueue(error, token = null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  refreshQueue = [];
}

async function performTokenRefresh() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token available');

  // Raw axios call — bypasses apiClient's interceptors entirely
  const response = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
  const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.data;

  setAccessToken(newAccessToken);
  await setRefreshToken(newRefreshToken);

  return newAccessToken;
}

// ── Response interceptor — 401 refresh, 5xx retry, offline toast ──

const MAX_RETRIES = 3;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;

    // Network error (no response at all) — likely offline
    if (!response) {
      uiStore.showToast("You're offline — showing cached data where available.", 'offline');
      return Promise.reject(error);
    }

    // ── 401 — attempt token refresh, then retry original request ──
    if (response.status === 401 && !config._retriedAuth) {
      config._retriedAuth = true;

      if (isRefreshing) {
        // Another request is already refreshing — wait for it
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        })
          .then((token) => {
            config.headers.Authorization = `Bearer ${token}`;
            return apiClient(config);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;
      try {
        const newToken = await performTokenRefresh();
        processQueue(null, newToken);
        config.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(config);
      } catch (refreshError) {
        processQueue(refreshError, null);
        setAccessToken(null);
        await clearRefreshToken();
        authFailureHandler?.();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // ── 5xx — retry with exponential backoff, up to MAX_RETRIES ──
    if (response.status >= 500 && response.status < 600) {
      config._retryCount = config._retryCount || 0;
      if (config._retryCount < MAX_RETRIES) {
        config._retryCount += 1;
        const delay = 500 * 2 ** (config._retryCount - 1); // 500ms, 1s, 2s
        await new Promise((r) => setTimeout(r, delay));
        return apiClient(config);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

import axios from 'axios';
import { getRefreshToken, setRefreshToken, clearRefreshToken } from '@/utils/storage';
import { uiStore } from '@/stores/uiStore';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

let accessToken = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

let authFailureHandler = null;

export function registerAuthFailureHandler(fn) {
  authFailureHandler = fn;
}

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let isRefreshing = false;
let refreshQueue = [];

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

  const response = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
  const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.data;

  setAccessToken(newAccessToken);
  await setRefreshToken(newRefreshToken);

  return newAccessToken;
}

const MAX_RETRIES = 3;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;

    if (!response) {
      uiStore.showToast("You're offline — showing cached data where available.", 'offline');
      return Promise.reject(error);
    }

    if (response.status === 401 && !config._retriedAuth) {
      config._retriedAuth = true;

      if (isRefreshing) {
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

    if (response.status >= 500 && response.status < 600) {
      config._retryCount = config._retryCount || 0;
      if (config._retryCount < MAX_RETRIES) {
        config._retryCount += 1;
        const delay = 500 * 2 ** (config._retryCount - 1);
        await new Promise((r) => setTimeout(r, delay));
        return apiClient(config);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

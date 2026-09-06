// src/utils/storage.js
//
// Two storage backends, used for different things per the state architecture:
//   - SecureStore  — refresh token only (sensitive, small, slow — fine for one value)
//   - AsyncStorage — wardrobe cache, "remember me" email, anything larger/non-sensitive
//
// accessToken is NEVER persisted here — per authStore spec it lives in memory
// only and is re-derived by calling refreshAccessToken() on app boot using
// the persisted refresh token. This limits the blast radius if the device
// storage is ever compromised while the app is closed.

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  REFRESH_TOKEN: 'outfitai_refresh_token',
  REMEMBERED_EMAIL: 'outfitai_remembered_email',
  WARDROBE_CACHE: 'outfitai_wardrobe_cache',
  THEME_PREFERENCE: 'outfitai_theme_preference',
};

// ── SecureStore — refresh token ──────────────────────────────

export async function getRefreshToken() {
  try {
    return await SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
  } catch {
    return null;
  }
}

export async function setRefreshToken(token) {
  try {
    if (!token) return;
    await SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, token);
  } catch (err) {
    console.error('Failed to persist refresh token:', err.message);
  }
}

export async function clearRefreshToken() {
  try {
    await SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN);
  } catch {
    // non-fatal
  }
}

// ── AsyncStorage — remember-me email ─────────────────────────

export async function getRememberedEmail() {
  try {
    return await AsyncStorage.getItem(KEYS.REMEMBERED_EMAIL);
  } catch {
    return null;
  }
}

export async function setRememberedEmail(email) {
  try {
    if (email) await AsyncStorage.setItem(KEYS.REMEMBERED_EMAIL, email);
    else await AsyncStorage.removeItem(KEYS.REMEMBERED_EMAIL);
  } catch {
    // non-fatal
  }
}

// ── AsyncStorage — wardrobe offline cache ────────────────────
// Used by wardrobeStore to show cached items when offline
// (per "Purely frontend features" — offline wardrobe browsing).

export async function getCachedWardrobe() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.WARDROBE_CACHE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setCachedWardrobe(items) {
  try {
    await AsyncStorage.setItem(KEYS.WARDROBE_CACHE, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to cache wardrobe:', err.message);
  }
}

// ── AsyncStorage — theme preference ──────────────────────────

export async function getStoredTheme() {
  try {
    return await AsyncStorage.getItem(KEYS.THEME_PREFERENCE);
  } catch {
    return null;
  }
}

export async function setStoredTheme(theme) {
  try {
    await AsyncStorage.setItem(KEYS.THEME_PREFERENCE, theme);
  } catch {
    // non-fatal
  }
}

export { KEYS as STORAGE_KEYS };

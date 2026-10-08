import { Platform } from 'react-native';

const STORAGE_KEY_TOKEN = '@finance_tracker_token';
const STORAGE_KEY_API_URL = '@finance_tracker_api_url';

// Default LAN IP for physical device on Wi-Fi, fallback to localhost
export const DEFAULT_API_URL = 'http://192.168.0.11:3000/api';

let cachedApiUrl: string = DEFAULT_API_URL;
let cachedToken: string | null = null;
const memoryStore: Record<string, string> = {};

// Safe storage wrapper that never throws "native module is null"
async function safeGetItem(key: string): Promise<string | null> {
  try {
    // Dynamically attempt require to avoid crash if native module is null
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
      const val = await AsyncStorage.getItem(key);
      if (val !== null) return val;
    }
  } catch (err) {
    // Fallback gracefully
  }
  return memoryStore[key] ?? null;
}

async function safeSetItem(key: string, value: string): Promise<void> {
  memoryStore[key] = value;
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    if (AsyncStorage && typeof AsyncStorage.setItem === 'function') {
      await AsyncStorage.setItem(key, value);
    }
  } catch (err) {
    // Fallback gracefully
  }
}

async function safeRemoveItem(key: string): Promise<void> {
  delete memoryStore[key];
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    if (AsyncStorage && typeof AsyncStorage.removeItem === 'function') {
      await AsyncStorage.removeItem(key);
    }
  } catch (err) {
    // Fallback gracefully
  }
}

export async function initApi() {
  try {
    const savedUrl = await safeGetItem(STORAGE_KEY_API_URL);
    if (savedUrl) cachedApiUrl = savedUrl;

    const savedToken = await safeGetItem(STORAGE_KEY_TOKEN);
    if (savedToken) cachedToken = savedToken;
  } catch {}
}

export async function setApiUrl(url: string) {
  cachedApiUrl = url.trim().replace(/\/$/, '');
  await safeSetItem(STORAGE_KEY_API_URL, cachedApiUrl);
}

export function getApiUrl(): string {
  return cachedApiUrl;
}

export async function setAuthToken(token: string | null) {
  cachedToken = token;
  if (token) {
    await safeSetItem(STORAGE_KEY_TOKEN, token);
  } else {
    await safeRemoveItem(STORAGE_KEY_TOKEN);
  }
}

export function getAuthToken(): string | null {
  return cachedToken;
}

async function handleResponse(res: Response) {
  if (res.status === 401) {
    await setAuthToken(null);
    throw new Error('Session expired. Please log in again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Request failed with status ${res.status}`);
  }
  return data;
}

export const api = {
  async get(path: string) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (cachedToken) headers['Authorization'] = `Bearer ${cachedToken}`;

    const res = await fetch(`${cachedApiUrl}${path}`, {
      method: 'GET',
      headers,
    });
    return handleResponse(res);
  },

  async post(path: string, body: any) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (cachedToken) headers['Authorization'] = `Bearer ${cachedToken}`;

    const res = await fetch(`${cachedApiUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },
};

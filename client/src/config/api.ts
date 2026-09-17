import axios from 'axios';
import { Platform } from 'react-native';

declare const process: {
  env: Record<string, string | undefined>;
};

// Set EXPO_PUBLIC_API_URL for a specific device/network. The LAN fallback is for a physical Android device.
const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }

  if (Platform.OS === 'android') {
    return 'http://10.10.102.98:5000/api';
  }
  return 'http://localhost:5000/api';
};

export const API_BASE_URL = getBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

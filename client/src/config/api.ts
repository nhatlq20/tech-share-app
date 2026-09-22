import axios from 'axios';
import { Platform } from 'react-native';

declare const process: {
  env: Record<string, string | undefined>;
};

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }
  return 'http://localhost:5000/api';
};

export const API_BASE_URL = getBaseUrl();

let globalAuthToken: string | null = null;

export const setApiAuthToken = (token: string | null) => {
  globalAuthToken = token;
};

export const getApiAuthToken = () => globalAuthToken;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  if (globalAuthToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${globalAuthToken}`;
  }
  return config;
});

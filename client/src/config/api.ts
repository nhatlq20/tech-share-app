import axios from 'axios';
import { Platform } from 'react-native';

// Android emulator uses 10.0.2.2, iOS simulator/Web uses localhost
const getBaseUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.10.102.54:5000/api';
  }
  return 'http://localhost:5000/api';
};

export const API_BASE_URL = getBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

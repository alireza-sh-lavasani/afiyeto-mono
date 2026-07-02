import axios from 'axios';
import axiosRetry from 'axios-retry';

// Get backend URL from env, fallback to old project default
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://192.168.0.113:8000/app-backend';

export const appBackend = axios.create({
  baseURL: BACKEND_URL,
});

console.log(`PWA Backend Base URL: ${BACKEND_URL}`);

// Configure exponential backing retry for server errors
axiosRetry(appBackend, {
  retries: 3,
  retryDelay: (retryCount, error) => {
    console.log(`Axios retry attempt: ${retryCount}`);
    return axiosRetry.exponentialDelay(retryCount, error, 2000);
  },
  retryCondition: (error: any) => {
    return error?.response?.status >= 500;
  },
});

appBackend.interceptors.request.use(
  config => {
    console.log(`API Call to: ${config.baseURL}${config.url}`);
    return config;
  },
  error => {
    console.error('API Request Error: ', error);
    return Promise.reject(error);
  }
);

appBackend.interceptors.response.use(
  response => response,
  error => {
    console.error('API Response Error: ', error?.response?.data?.message || error);
    return Promise.reject(error);
  }
);
export default appBackend;

import axios from 'axios';
import { getToken } from '../utils/auth.js';
import { saveToken } from '../utils/auth.js';

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000' });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const asArray = (data, ...keys) => {
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
};

export async function login(payload) {
  const { data } = await api.post('/api/login', payload);
  if (data?.token) saveToken(data.token);
  return data;
}

export async function getProfiles(params = {}) {
  const { data } = await api.get('/api/users', { params });
  return asArray(data, 'profiles', 'users', 'data');
}

export async function createProfile(payload) {
  const { data } = await api.post('/api/users', payload);
  return data;
}

export async function generateMatches(payload) {
  const { data } = await api.post('/api/matches/generate', payload);
  return asArray(data, 'matches', 'data');
}

export async function createMatch(payload) {
  const { data } = await api.post('/api/matches', payload);
  return data;
}

export async function autoMatchAll() {
  const { data } = await api.post('/api/matches/auto-match');
  return data;
}

export async function getConnections() {
  const { data } = await api.get('/api/connections');
  return asArray(data, 'connections', 'data');
}

export async function updateConnectionStatus(id, payload) {
  const { data } = await api.patch(`/api/connections/${id}`, payload);
  return data;
}

export async function getSessions() {
  const { data } = await api.get('/api/sessions');
  return asArray(data, 'sessions', 'data');
}

export async function createSession(payload) {
  const { data } = await api.post('/api/sessions', payload);
  return data;
}

export async function getFeedback() {
  const { data } = await api.get('/api/feedback');
  return asArray(data, 'feedback', 'data');
}

export async function submitFeedback(payload) {
  const { data } = await api.post('/api/feedback', payload);
  return data;
}

export default api;

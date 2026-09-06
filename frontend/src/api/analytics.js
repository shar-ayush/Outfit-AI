// src/api/analytics.js
//
// Maps 1:1 to backend/src/routes/analytics.js

import apiClient from './client';

export async function getDashboard() {
  const { data } = await apiClient.get('/analytics/dashboard');
  return data.data;
}

export async function getCostPerWear() {
  const { data } = await apiClient.get('/analytics/cost-per-wear');
  return data.data;
}

export async function getWearFrequency(limit = 10) {
  const { data } = await apiClient.get('/analytics/wear-frequency', { params: { limit } });
  return data.data; // { mostWorn, leastWorn, neverWorn }
}

export async function getSleepingItems() {
  const { data } = await apiClient.get('/analytics/sleeping-items');
  return data.data; // { items, count, tip }
}

export async function getUtilization() {
  const { data } = await apiClient.get('/analytics/utilization');
  return data.data;
}

export async function triggerDecay() {
  const { data } = await apiClient.post('/analytics/decay');
  return data.data;
}

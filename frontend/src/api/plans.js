// src/api/plans.js
//
// Maps 1:1 to backend/src/routes/plans.js

import apiClient from './client';

export async function createPlan({ outfitId, date, occasion, notes, recommendationId }) {
  const { data } = await apiClient.post('/plans', { outfitId, date, occasion, notes, recommendationId });
  return data.data.plan;
}

// date should be an ISO date string ('2024-08-12') — matches backend expectation
export async function getWeekPlan(startDate) {
  const { data } = await apiClient.get('/plans/week', {
    params: startDate ? { startDate } : {},
  });
  return data.data.week; // array of 7 { date, dayOfWeek, plan }
}

export async function getPlans(params = {}) {
  const { data } = await apiClient.get('/plans', { params });
  return data.data; // { plans, pagination }
}

// status: 'planned' | 'worn' | 'skipped' | 'cancelled'
export async function updatePlanStatus(planId, { status, rating, feedback }) {
  const { data } = await apiClient.patch(`/plans/${planId}/status`, { status, rating, feedback });
  return data.data.plan;
}

export async function deletePlan(planId) {
  const { data } = await apiClient.delete(`/plans/${planId}`);
  return data.data;
}
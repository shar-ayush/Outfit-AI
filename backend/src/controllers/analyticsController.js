import ApiResponse from '../utils/ApiResponse.js'
import asyncHandler from '../utils/asyncHandler.js'
import {
  getDashboardSummary,
  getCostPerWearAnalytics,
  getWearFrequency,
  getSleepingItems,
  getWardrobeUtilization,
} from '../services/analyticsService.js'
import { runDecay } from '../services/learning/signalProcessor.js'

// ─────────────────────────────────────────────
// Full dashboard summary
// GET /api/analytics/dashboard
// ─────────────────────────────────────────────

export const dashboard = asyncHandler(async (req, res) => {
  const summary = await getDashboardSummary(req.user._id)

  return res.json(
    new ApiResponse(200, summary, 'Dashboard fetched')
  )
})

// ─────────────────────────────────────────────
// Cost per wear analytics
// GET /api/analytics/cost-per-wear
// ─────────────────────────────────────────────

export const costPerWear = asyncHandler(async (req, res) => {
  const data = await getCostPerWearAnalytics(req.user._id)

  return res.json(
    new ApiResponse(200, data, 'Cost per wear analytics fetched')
  )
})

// ─────────────────────────────────────────────
// Wear frequency
// GET /api/analytics/wear-frequency
// Query: limit
// ─────────────────────────────────────────────

export const wearFrequency = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10
  const data  = await getWearFrequency(req.user._id, limit)

  return res.json(
    new ApiResponse(200, data, 'Wear frequency fetched')
  )
})

// ─────────────────────────────────────────────
// Sleeping items
// GET /api/analytics/sleeping-items
// ─────────────────────────────────────────────

export const sleepingItems = asyncHandler(async (req, res) => {
  const data = await getSleepingItems(req.user._id)

  return res.json(
    new ApiResponse(200, data, 'Sleeping items fetched')
  )
})

// ─────────────────────────────────────────────
// Wardrobe utilization
// GET /api/analytics/utilization
// ─────────────────────────────────────────────

export const utilization = asyncHandler(async (req, res) => {
  const data = await getWardrobeUtilization(req.user._id)

  return res.json(
    new ApiResponse(200, data, 'Utilization data fetched')
  )
})

// ─────────────────────────────────────────────
// Manual decay trigger (for testing / admin)
// POST /api/analytics/decay
// ─────────────────────────────────────────────

export const triggerDecay = asyncHandler(async (req, res) => {
  const result = await runDecay(req.user._id)

  return res.json(
    new ApiResponse(200, result, 'Decay run complete')
  )
})
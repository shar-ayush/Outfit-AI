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

export const dashboard = asyncHandler(async (req, res) => {
  const summary = await getDashboardSummary(req.user._id)

  return res.json(
    new ApiResponse(200, summary, 'Dashboard fetched')
  )
})

export const costPerWear = asyncHandler(async (req, res) => {
  const data = await getCostPerWearAnalytics(req.user._id)

  return res.json(
    new ApiResponse(200, data, 'Cost per wear analytics fetched')
  )
})

export const wearFrequency = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10
  const data  = await getWearFrequency(req.user._id, limit)

  return res.json(
    new ApiResponse(200, data, 'Wear frequency fetched')
  )
})

export const sleepingItems = asyncHandler(async (req, res) => {
  const data = await getSleepingItems(req.user._id)

  return res.json(
    new ApiResponse(200, data, 'Sleeping items fetched')
  )
})

export const utilization = asyncHandler(async (req, res) => {
  const data = await getWardrobeUtilization(req.user._id)

  return res.json(
    new ApiResponse(200, data, 'Utilization data fetched')
  )
})

export const triggerDecay = asyncHandler(async (req, res) => {
  const result = await runDecay(req.user._id)

  return res.json(
    new ApiResponse(200, result, 'Decay run complete')
  )
})
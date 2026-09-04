import ApiResponse from '../utils/ApiResponse.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'
import WearLog from '../models/WearLog.js'
import Outfit from '../models/Outfit.js'
import { processSignal } from '../services/learning/signalProcessor.js'
import { getWearHistory } from '../services/analyticsService.js'

// ─────────────────────────────────────────────
// Log a wear event
// POST /api/wear-logs
// Body: { outfitId, occasion, rating?, feedback?, temperature?, condition?, recommendationId? }
// ─────────────────────────────────────────────

export const logWear = asyncHandler(async (req, res) => {
  const {
    outfitId,
    occasion,
    rating,
    feedback,
    temperature,
    condition,
    recommendationId = null,
  } = req.body

  if (!outfitId) {
    throw new ApiError(400, 'outfitId is required')
  }

  // Verify outfit belongs to user
  const outfit = await Outfit.findOne({
    _id:    outfitId,
    userId: req.user._id,
  })
  if (!outfit) throw new ApiError(404, 'Outfit not found')

  const clothIds = outfit.items.map(i => i.clothId.toString())

  // Build context
  const now = new Date()
  const context = {
    occasion:    occasion || outfit.occasion,
    formality:   outfit.formality,
    season:      getSeason(now.getMonth()),
    dayOfWeek:   now.getDay(),
    temperature: temperature ? parseFloat(temperature) : undefined,
    condition:   condition,
  }

  // Create wear log
  const wearLog = await WearLog.create({
    userId:   req.user._id,
    outfitId,
    items:    clothIds.map(id => ({ clothId: id })),
    context,
    rating:   rating   ? parseInt(rating)   : undefined,
    feedback: feedback || undefined,
    fromRecommendation: !!recommendationId,
    recommendationId:   recommendationId || undefined,
    wornAt: now,
  })

  // Trigger learning pipeline — non-blocking
  processSignal({
    userId:    req.user._id,
    outfitId,
    eventType: 'worn',
    rating:    rating ? parseInt(rating) : null,
    feedback,
    context,
  }).catch(err => console.error('Signal processing error:', err.message))

  return res.status(201).json(
    new ApiResponse(201, { wearLog }, 'Wear logged successfully')
  )
})

// ─────────────────────────────────────────────
// Get wear history
// GET /api/wear-logs
// Query: page, limit
// ─────────────────────────────────────────────

export const getHistory = asyncHandler(async (req, res) => {
  const result = await getWearHistory(req.user._id, req.query)

  return res.json(
    new ApiResponse(200, result, 'Wear history fetched')
  )
})

// ─────────────────────────────────────────────
// Get wear log by ID
// GET /api/wear-logs/:logId
// ─────────────────────────────────────────────

export const getWearLog = asyncHandler(async (req, res) => {
  const log = await WearLog.findOne({
    _id:    req.params.logId,
    userId: req.user._id,
  })
    .populate({
      path:   'outfitId',
      select: 'items outfitName',
      populate: {
        path:   'items.clothId',
        select: 'imageUrl category color subCategory',
      },
    })
    .lean()

  if (!log) throw new ApiError(404, 'Wear log not found')

  return res.json(
    new ApiResponse(200, { log }, 'Wear log fetched')
  )
})

// ─────────────────────────────────────────────
// Delete wear log
// DELETE /api/wear-logs/:logId
// ─────────────────────────────────────────────

export const deleteWearLog = asyncHandler(async (req, res) => {
  const log = await WearLog.findOneAndDelete({
    _id:    req.params.logId,
    userId: req.user._id,
  })

  if (!log) throw new ApiError(404, 'Wear log not found')

  return res.json(
    new ApiResponse(200, {}, 'Wear log deleted')
  )
})

// ─────────────────────────────────────────────
// Helper — get season from month index
// ─────────────────────────────────────────────

function getSeason(month) {
  if (month >= 2  && month <= 4) return 'spring'
  if (month >= 5  && month <= 7) return 'summer'
  if (month >= 8  && month <= 10) return 'autumn'
  return 'winter'
}
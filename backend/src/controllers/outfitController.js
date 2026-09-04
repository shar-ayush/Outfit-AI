import ApiResponse from '../utils/ApiResponse.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'
import {
  getOutfitRecommendations,
  recordOutfitAction,
  getSavedOutfits,
  getOutfitById,
  deleteOutfit,
} from '../services/outfitService.js'

// ─────────────────────────────────────────────
// Get outfit recommendations
// POST /api/outfits/suggest
// Body: { query, sessionId?, count?, location? }
// ─────────────────────────────────────────────

export const suggestOutfits = asyncHandler(async (req, res) => {
  const {
    query,
    sessionId     = null,
    count         = 3,
    weatherContext = null,
  } = req.body

  if (!query || query.trim().length === 0) {
    throw new ApiError(400, 'Query is required')
  }

  const result = await getOutfitRecommendations({
    userId:   req.user._id,
    query:    query.trim(),
    sessionId,
    count:    Math.min(parseInt(count) || 3, 5), // cap at 5
    weatherContext,
  })

  return res.json(
    new ApiResponse(200, result, 'Outfits generated')
  )
})

// ─────────────────────────────────────────────
// Record action on an outfit
// POST /api/outfits/:outfitId/action
// Body: { action, recommendationId?, rating?, feedback?, context? }
// action: worn | saved | rejected | skipped | shared | rated
// ─────────────────────────────────────────────

export const outfitAction = asyncHandler(async (req, res) => {
  const {
    action,
    recommendationId = null,
    rating           = null,
    feedback         = null,
    context          = {},
  } = req.body

  const validActions = ['worn', 'saved', 'rejected', 'skipped', 'shared', 'rated']
  if (!validActions.includes(action)) {
    throw new ApiError(400, `Action must be one of: ${validActions.join(', ')}`)
  }

  if (action === 'rated' && (!rating || rating < 1 || rating > 5)) {
    throw new ApiError(400, 'Rating must be between 1 and 5')
  }

  const result = await recordOutfitAction({
    userId:           req.user._id,
    outfitId:         req.params.outfitId,
    recommendationId,
    eventType:        action,
    rating:           rating ? parseInt(rating) : null,
    feedback,
    context,
  })

  return res.json(
    new ApiResponse(200, result, `Outfit ${action} recorded`)
  )
})

// ─────────────────────────────────────────────
// Get saved outfits
// GET /api/outfits/saved
// Query: page, limit
// ─────────────────────────────────────────────

export const getSaved = asyncHandler(async (req, res) => {
  const result = await getSavedOutfits(req.user._id, req.query)

  return res.json(
    new ApiResponse(200, result, 'Saved outfits fetched')
  )
})

// ─────────────────────────────────────────────
// Get single outfit
// GET /api/outfits/:outfitId
// ─────────────────────────────────────────────

export const getOutfit = asyncHandler(async (req, res) => {
  const outfit = await getOutfitById(req.params.outfitId, req.user._id)

  return res.json(
    new ApiResponse(200, { outfit }, 'Outfit fetched')
  )
})

// ─────────────────────────────────────────────
// Delete outfit
// DELETE /api/outfits/:outfitId
// ─────────────────────────────────────────────

export const removeOutfit = asyncHandler(async (req, res) => {
  const result = await deleteOutfit(req.params.outfitId, req.user._id)

  return res.json(
    new ApiResponse(200, result, 'Outfit deleted')
  )
})
import ApiResponse from '../utils/ApiResponse.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'
import {
  handleStylistMessage,
  getSessionHistory,
  getUserSessions,
  clearSession,
} from '../services/stylistService.js'

// ─────────────────────────────────────────────
// Send message to stylist
// POST /api/stylist/chat
// Body: { message, sessionId?, weatherContext? }
// ─────────────────────────────────────────────

export const chat = asyncHandler(async (req, res) => {
  const {
    message,
    sessionId      = null,
    weatherContext = null,
  } = req.body

  if (!message || message.trim().length === 0) {
    throw new ApiError(400, 'Message is required')
  }

  if (message.trim().length > 500) {
    throw new ApiError(400, 'Message too long (max 500 characters)')
  }

  const result = await handleStylistMessage({
    userId:   req.user._id,
    message:  message.trim(),
    sessionId,
    weatherContext,
  })

  return res.json(
    new ApiResponse(200, result, 'Response generated')
  )
})

// ─────────────────────────────────────────────
// Get session history
// GET /api/stylist/sessions/:sessionId
// ─────────────────────────────────────────────

export const getSession = asyncHandler(async (req, res) => {
  const session = await getSessionHistory(
    req.params.sessionId,
    req.user._id
  )

  return res.json(
    new ApiResponse(200, { session }, 'Session fetched')
  )
})

// ─────────────────────────────────────────────
// Get all user sessions
// GET /api/stylist/sessions
// Query: page, limit
// ─────────────────────────────────────────────

export const getSessions = asyncHandler(async (req, res) => {
  const result = await getUserSessions(req.user._id, req.query)

  return res.json(
    new ApiResponse(200, result, 'Sessions fetched')
  )
})

// ─────────────────────────────────────────────
// Clear session — start fresh
// DELETE /api/stylist/sessions/:sessionId
// ─────────────────────────────────────────────

export const clearSessionHandler = asyncHandler(async (req, res) => {
  const result = await clearSession(
    req.params.sessionId,
    req.user._id
  )

  return res.json(
    new ApiResponse(200, result, 'Session cleared')
  )
})
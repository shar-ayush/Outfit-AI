import ApiResponse from '../utils/ApiResponse.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'
import User from '../models/User.js'
import ItemPreference from '../models/ItemPreference.js'
import ContextPreference from '../models/ContextPreference.js'

// ─────────────────────────────────────────────
// Get profile
// GET /api/user/profile
// ─────────────────────────────────────────────

export const getProfile = asyncHandler(async (req, res) => {
  return res.json(
    new ApiResponse(200, { user: req.user }, 'Profile fetched')
  )
})

// ─────────────────────────────────────────────
// Update profile
// PATCH /api/user/profile
// Body: { username, gender }
// ─────────────────────────────────────────────

export const updateProfile = asyncHandler(async (req, res) => {
  const { username, gender } = req.body

  const updateData = {}

  if (username) {
    const exists = await User.findOne({
      username: username.toLowerCase().trim(),
      _id:      { $ne: req.user._id },
    })
    if (exists) throw new ApiError(409, 'Username already taken')
    updateData.username = username.toLowerCase().trim()
  }

  if (gender) {
    const validGenders = ['male', 'female', 'other', 'prefer_not_to_say']
    if (!validGenders.includes(gender)) {
      throw new ApiError(400, 'Invalid gender value')
    }
    updateData.gender = gender
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    updateData,
    { new: true }
  )

  return res.json(
    new ApiResponse(200, { user }, 'Profile updated')
  )
})

// ─────────────────────────────────────────────
// Complete onboarding quiz
// POST /api/user/onboarding
// Body: { preferredStyles, preferredColors, preferredFormality, climate }
// Seeds the cold-start preference profile
// ─────────────────────────────────────────────

export const completeOnboarding = asyncHandler(async (req, res) => {
  const {
    preferredStyles    = [],
    preferredColors    = [],
    preferredFormality = [],
    climate,
  } = req.body

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      styleProfile: {
        preferredStyles,
        preferredColors,
        preferredFormality,
        climate,
      },
      onboardingCompleted: true,
    },
    { new: true }
  )

  // Seed context preferences from quiz answers
  // This gives the recommendation engine something to work with
  // before any wear data exists (cold start)
  if (preferredStyles.length > 0 || preferredColors.length > 0) {
    const occasions = ['casual', 'office', 'formal', 'party', 'date']

    await Promise.all(
      occasions.map(async (occasion) => {
        const formality = occasion === 'office' || occasion === 'formal'
          ? 'formal'
          : 'casual'

        const contextKey = `${occasion}_${formality}`

        const colorFrequency = {}
        preferredColors.forEach(color => {
          colorFrequency[color.toLowerCase()] = 2 // seed with weight 2
        })

        const styleFrequency = {}
        preferredStyles.forEach(style => {
          styleFrequency[style.toLowerCase()] = 2
        })

        await ContextPreference.findOneAndUpdate(
          { userId: req.user._id, contextKey },
          {
            $set: {
              occasion,
              formality,
              colorFrequency,
              styleFrequency,
              lastUpdatedAt: new Date(),
            },
            $inc: { interactionCount: 1 },
            $setOnInsert: { confidence: 0.1 },
          },
          { upsert: true, new: true }
        )
      })
    )
  }

  return res.json(
    new ApiResponse(200, { user }, 'Onboarding completed')
  )
})

// ─────────────────────────────────────────────
// Change password
// POST /api/user/change-password
// Body: { currentPassword, newPassword }
// ─────────────────────────────────────────────

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'Current and new password are required')
  }

  if (newPassword.length < 8) {
    throw new ApiError(400, 'New password must be at least 8 characters')
  }

  const user = await User.findById(req.user._id).select('+password')
  const isValid = await user.comparePassword(currentPassword)

  if (!isValid) {
    throw new ApiError(401, 'Current password is incorrect')
  }

  user.password = newPassword
  // Clear all refresh tokens on password change
  user.refreshTokens = []
  await user.save()

  return res.json(
    new ApiResponse(200, {}, 'Password changed. Please log in again.')
  )
})

// ─────────────────────────────────────────────
// Get user preference summary
// GET /api/user/preferences
// Shows what the system has learned about the user
// Useful for a "your style profile" screen
// ─────────────────────────────────────────────

export const getPreferences = asyncHandler(async (req, res) => {
  const [itemPrefs, contextPrefs] = await Promise.all([
    ItemPreference.find({ userId: req.user._id })
      .sort({ score: -1 })
      .limit(10)
      .populate({
        path:   'clothId',
        select: 'imageUrl category color subCategory',
      })
      .lean(),

    ContextPreference.find({ userId: req.user._id })
      .sort({ interactionCount: -1 })
      .lean(),
  ])

  // Top 5 favorite items
  const favoriteItems = itemPrefs
    .filter(p => p.score > 0.7 && p.confidence > 0.2)
    .slice(0, 5)
    .map(p => ({
      cloth:      p.clothId,
      score:      p.score,
      wornCount:  p.signals.worn,
    }))

  // Context summaries — what style per occasion
  const contextSummaries = contextPrefs.map(ctx => {
    // Get top 3 colors and styles
    const colorEntries = Object.entries(
      Object.fromEntries(ctx.colorFrequency || [])
    ).sort((a, b) => b[1] - a[1]).slice(0, 3)

    const styleEntries = Object.entries(
      Object.fromEntries(ctx.styleFrequency || [])
    ).sort((a, b) => b[1] - a[1]).slice(0, 3)

    return {
      context:    ctx.contextKey,
      occasion:   ctx.occasion,
      formality:  ctx.formality,
      topColors:  colorEntries.map(([color]) => color),
      topStyles:  styleEntries.map(([style]) => style),
      confidence: ctx.confidence,
      interactions: ctx.interactionCount,
    }
  })

  return res.json(
    new ApiResponse(200, {
      favoriteItems,
      contextProfiles: contextSummaries,
      learningPhase:   req.user.learningPhase,
      styleProfile:    req.user.styleProfile,
    }, 'Preferences fetched')
  )
})

// ─────────────────────────────────────────────
// Delete account
// DELETE /api/user/account
// Body: { password }
// ─────────────────────────────────────────────

export const deleteAccount = asyncHandler(async (req, res) => {
  const { password } = req.body
  if (!password) throw new ApiError(400, 'Password required to delete account')

  const user = await User.findById(req.user._id).select('+password')
  const isValid = await user.comparePassword(password)
  if (!isValid) throw new ApiError(401, 'Incorrect password')

  // Cascade delete all user data
  const userId = req.user._id
  await Promise.all([
    (await import('../models/Cloth.js')).default.deleteMany({ userId }),
    (await import('../models/Outfit.js')).default.deleteMany({ userId }),
    (await import('../models/OutfitPlan.js')).default.deleteMany({ userId }),
    (await import('../models/WearLog.js')).default.deleteMany({ userId }),
    (await import('../models/Recommendation.js')).default.deleteMany({ userId }),
    (await import('../models/RecommendationEvent.js')).default.deleteMany({ userId }),
    (await import('../models/ItemPreference.js')).default.deleteMany({ userId }),
    (await import('../models/PairPreference.js')).default.deleteMany({ userId }),
    (await import('../models/ContextPreference.js')).default.deleteMany({ userId }),
    (await import('../models/ConversationSession.js')).default.deleteMany({ userId }),
    User.findByIdAndDelete(userId),
  ])

  return res.json(
    new ApiResponse(200, {}, 'Account deleted successfully')
  )
})
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import ApiError from '../utils/ApiError.js'
import ApiResponse from '../utils/ApiResponse.js'
import asyncHandler from '../utils/asyncHandler.js'

// ─────────────────────────────────────────────
// Token generation helpers
// ─────────────────────────────────────────────

function generateAccessToken(userId) {
  return jwt.sign(
    { id: userId },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
  )
}

function generateRefreshToken(userId) {
  return jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || '30d' }
  )
}

// ─────────────────────────────────────────────
// Register
// POST /api/auth/register
// ─────────────────────────────────────────────

export const register = asyncHandler(async (req, res) => {
  const { email, password, username, gender } = req.body

  if (!email || !password || !username) {
    throw new ApiError(400, 'Email, password and username are required')
  }

  if (password.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters')
  }

  // Check duplicates
  const existing = await User.findOne({
    $or: [
      { email:    email.toLowerCase().trim() },
      { username: username.toLowerCase().trim() },
    ],
  })

  if (existing) {
    const field = existing.email === email.toLowerCase().trim()
      ? 'Email'
      : 'Username'
    throw new ApiError(409, `${field} already in use`)
  }

  const user = await User.create({
    email:    email.toLowerCase().trim(),
    password,
    username: username.toLowerCase().trim(),
    gender:   gender || undefined,
  })

  const accessToken  = generateAccessToken(user._id)
  const refreshToken = generateRefreshToken(user._id)

  // Store refresh token
  await User.findByIdAndUpdate(user._id, {
    $push: { refreshTokens: refreshToken },
  })

  return res.status(201).json(
    new ApiResponse(201, {
      user: {
        _id:      user._id,
        email:    user.email,
        username: user.username,
        gender:   user.gender,
        onboardingCompleted: user.onboardingCompleted,
        learningPhase:       user.learningPhase,
      },
      accessToken,
      refreshToken,
    }, 'Account created successfully')
  )
})

// ─────────────────────────────────────────────
// Login
// POST /api/auth/login
// ─────────────────────────────────────────────

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required')
  }

  // Explicitly select password (select: false in schema)
  const user = await User.findOne({
    email: email.toLowerCase().trim(),
  }).select('+password +refreshTokens')

  if (!user) {
    throw new ApiError(401, 'Invalid email or password')
  }

  const isPasswordValid = await user.comparePassword(password)
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid email or password')
  }

  const accessToken  = generateAccessToken(user._id)
  const refreshToken = generateRefreshToken(user._id)

  // Store refresh token — cap at 5 devices
  const tokens = [...(user.refreshTokens || []), refreshToken].slice(-5)
  await User.findByIdAndUpdate(user._id, { refreshTokens: tokens })

  return res.json(
    new ApiResponse(200, {
      user: {
        _id:      user._id,
        email:    user.email,
        username: user.username,
        gender:   user.gender,
        styleProfile:        user.styleProfile,
        onboardingCompleted: user.onboardingCompleted,
        learningPhase:       user.learningPhase,
      },
      accessToken,
      refreshToken,
    }, 'Logged in successfully')
  )
})

// ─────────────────────────────────────────────
// Refresh access token
// POST /api/auth/refresh
// Body: { refreshToken }
// ─────────────────────────────────────────────

export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body

  if (!token) {
    throw new ApiError(400, 'Refresh token required')
  }

  let decoded
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET)
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token')
  }

  const user = await User.findById(decoded.id).select('+refreshTokens')

  if (!user || !user.refreshTokens.includes(token)) {
    throw new ApiError(401, 'Refresh token not recognised')
  }

  // Rotate refresh token — old one is invalidated
  const newAccessToken  = generateAccessToken(user._id)
  const newRefreshToken = generateRefreshToken(user._id)

  const updatedTokens = user.refreshTokens
    .filter(t => t !== token)
    .concat(newRefreshToken)
    .slice(-5)

  await User.findByIdAndUpdate(user._id, {
    refreshTokens: updatedTokens,
  })

  return res.json(
    new ApiResponse(200, {
      accessToken:  newAccessToken,
      refreshToken: newRefreshToken,
    }, 'Token refreshed')
  )
})

// ─────────────────────────────────────────────
// Logout
// POST /api/auth/logout
// Body: { refreshToken }
// Invalidates this device's refresh token
// ─────────────────────────────────────────────

export const logout = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body
  const userId = req.user._id

  if (token) {
    await User.findByIdAndUpdate(userId, {
      $pull: { refreshTokens: token },
    })
  }

  return res.json(
    new ApiResponse(200, {}, 'Logged out successfully')
  )
})

// ─────────────────────────────────────────────
// Logout all devices
// POST /api/auth/logout-all
// Clears all refresh tokens
// ─────────────────────────────────────────────

export const logoutAll = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    refreshTokens: [],
  })

  return res.json(
    new ApiResponse(200, {}, 'Logged out from all devices')
  )
})

// ─────────────────────────────────────────────
// Get current user
// GET /api/auth/me
// ─────────────────────────────────────────────

export const getMe = asyncHandler(async (req, res) => {
  return res.json(
    new ApiResponse(200, { user: req.user }, 'User fetched')
  )
})
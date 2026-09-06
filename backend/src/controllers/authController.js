import jwt from 'jsonwebtoken'
import crypto from 'crypto'
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

// ─────────────────────────────────────────────
// Forgot password — request a reset token
// POST /api/auth/forgot-password
// Body: { email }
//
// ⚠️ DEV-MODE BEHAVIOR: there is no email service wired into this
// backend (no nodemailer/SES/SendGrid config exists anywhere in the
// codebase). Rather than silently pretending an email was sent, this
// endpoint returns the reset token directly in the response so the
// frontend flow is fully testable without email infrastructure.
// BEFORE SHIPPING TO PRODUCTION: remove `resetToken` from the response
// and instead email it to the user via a real mail service.
// ─────────────────────────────────────────────
 
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body
  if (!email) throw new ApiError(400, 'Email is required')
 
  const user = await User.findOne({ email: email.toLowerCase().trim() })
 
  // Always return 200 even if no user found — don't leak which emails
  // are registered. Only actually generate/store a token if one exists.
  if (!user) {
    return res.json(
      new ApiResponse(200, {}, 'If that email exists, a reset link has been sent')
    )
  }
 
  const resetToken = crypto.randomBytes(32).toString('hex')
  const resetExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
 
  await User.findByIdAndUpdate(user._id, {
    resetPasswordToken: resetToken,
    resetPasswordExpires: resetExpires,
  })
 
  return res.json(
    new ApiResponse(200, {
      message: 'If that email exists, a reset link has been sent',
      // DEV ONLY — see header comment. Remove this field in production.
      devResetToken: resetToken,
    }, 'Reset token generated')
  )
})
 
// ─────────────────────────────────────────────
// Reset password with token
// POST /api/auth/reset-password
// Body: { token, newPassword }
// ─────────────────────────────────────────────
 
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body
 
  if (!token || !newPassword) {
    throw new ApiError(400, 'Token and new password are required')
  }
  if (newPassword.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters')
  }
 
  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: new Date() },
  }).select('+resetPasswordToken +resetPasswordExpires')
 
  if (!user) {
    throw new ApiError(400, 'Reset token is invalid or has expired')
  }
 
  user.password = newPassword
  user.resetPasswordToken = undefined
  user.resetPasswordExpires = undefined
  user.refreshTokens = [] // force re-login everywhere, same as changePassword
  await user.save()
 
  return res.json(
    new ApiResponse(200, {}, 'Password reset successfully — please log in')
  )
})
 
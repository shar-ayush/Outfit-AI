import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'

import authRoutes       from './src/routes/auth.js'
import wardrobeRoutes   from './src/routes/wardrobe.js'
import outfitRoutes     from './src/routes/outfits.js'
import planRoutes       from './src/routes/plans.js'
import wearLogRoutes    from './src/routes/wearLogs.js'
import stylistRoutes    from './src/routes/stylist.js'
import analyticsRoutes  from './src/routes/analytics.js'
import userRoutes       from './src/routes/user.js'
import errorHandler     from './src/middleware/errorHandler.js'

const app = express()

// Security
app.use(helmet())
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later' },
})
app.use('/api', limiter)

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Request & response logging (enabled by default unless explicitly in production)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))

  app.use((req, res, next) => {
    const startTime = Date.now()
    const timestamp = new Date().toLocaleTimeString()

    // Helper to safely format body (truncate huge base64/long strings for readability)
    const sanitizeData = (data) => {
      if (!data || typeof data !== 'object') return data
      try {
        const copy = Array.isArray(data) ? [...data] : { ...data }
        for (const [key, val] of Object.entries(copy)) {
          if (typeof val === 'string' && val.length > 250) {
            copy[key] = `${val.substring(0, 50)}... [truncated, ${val.length} chars]`
          } else if (key.toLowerCase().includes('password')) {
            copy[key] = '********'
          } else if (typeof val === 'object' && val !== null) {
            copy[key] = sanitizeData(val)
          }
        }
        return copy
      } catch {
        return data
      }
    }

    console.log(`\n==================== [${timestamp}] API REQUEST ====================`)
    console.log(`📍 ${req.method} ${req.originalUrl}`)
    if (req.headers.authorization) {
      console.log(`🔑 Auth: Bearer Token Present (${req.headers.authorization.substring(0, 18)}...)`)
    } else {
      console.log(`🔑 Auth: No Authorization Header`)
    }

    if (req.query && Object.keys(req.query).length > 0) {
      console.log('🔍 Query Params:', JSON.stringify(req.query, null, 2))
    }
    if (req.params && Object.keys(req.params).length > 0) {
      console.log('📌 Route Params:', JSON.stringify(req.params, null, 2))
    }
    if (req.body && Object.keys(req.body).length > 0) {
      console.log('📦 Request Body:', JSON.stringify(sanitizeData(req.body), null, 2))
    }

    // Intercept res.json to log the response
    const originalJson = res.json
    res.json = function (body) {
      const duration = Date.now() - startTime
      const statusColor = res.statusCode >= 500 ? '❌' : res.statusCode >= 400 ? '⚠️' : '✅'

      console.log(`-------------------- API RESPONSE [${statusColor} ${res.statusCode}] (${duration}ms) --------------------`)
      console.log(`📍 ${req.method} ${req.originalUrl}`)
      console.log('📤 Response Data:', JSON.stringify(sanitizeData(body), null, 2))
      console.log(`========================================================================\n`)

      return originalJson.call(this, body)
    }

    next()
  })
}

// Health check
app.get(['/health', '/api/health'], (req, res) => {
  res.json({ success: true, message: 'OutfitAI API is running' })
})

// Routes
app.use('/api/auth',      authRoutes)
app.use('/api/wardrobe',  wardrobeRoutes)
app.use('/api/outfits',   outfitRoutes)
app.use('/api/plans',     planRoutes)
app.use('/api/wear-logs', wearLogRoutes)
app.use('/api/stylist',   stylistRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/user',      userRoutes)

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' })
})

// Error handler — must be last
app.use(errorHandler)

export default app
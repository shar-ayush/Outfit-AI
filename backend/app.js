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

// Logging in development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

// Health check
app.get('/health', (req, res) => {
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
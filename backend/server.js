import 'dotenv/config'
import app from './app.js'
import connectDB from './src/config/db.js'

const PORT = process.env.PORT || 5000

// Catch unhandled rejections to prevent silent node crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection]:', reason?.message || reason)
})

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]:', err)
})

const startServer = async () => {
  await connectDB()

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Server running on port ${PORT}`)
    console.log(`🌐 Local: http://localhost:${PORT}`)
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`)
    console.log(`📋 Request & Response terminal logging is ACTIVE\n`)
  })
}

startServer()
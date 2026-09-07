import ApiError from '../utils/ApiError.js'

const errorHandler = (err, req, res, next) => {

  console.error('\n🚨 ==================== API ERROR ====================')
  console.error(`📍 Route: ${req.method} ${req.originalUrl}`)
  console.error(`💥 Status: ${err.statusCode || 500}`)
  console.error(`⚠️ Message: ${err.message}`)
  if (err.errors && Array.isArray(err.errors) && err.errors.length > 0) {
    console.error('📋 Validation Errors:', JSON.stringify(err.errors, null, 2))
  }
  console.error('📚 Stack Trace:\n', err.stack)
  console.error('====================================================\n')
  
  let error = err

  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500
    const message = error.message || 'Something went wrong'
    error = new ApiError(statusCode, message, [], err.stack)
  }

  const response = {
    success:    false,
    message:    error.message,
    errors:     error.errors,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
  }

  return res.status(error.statusCode).json(response)
}

export default errorHandler
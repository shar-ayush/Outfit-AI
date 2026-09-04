import ApiError from '../utils/ApiError.js'

// Simple validator middleware factory
export const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false })
  if (error) {
    const errors = error.details.map(d => d.message)
    throw new ApiError(400, 'Validation failed', errors)
  }
  next()
}
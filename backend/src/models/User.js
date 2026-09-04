import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema({
  email: {
    type:     String,
    required: true,
    unique:   true,
    lowercase: true,
    trim:     true,
  },
  password: {
    type:     String,
    required: true,
    select:   false, // never return password in queries
  },
  username: {
    type:     String,
    required: true,
    unique:   true,
    trim:     true,
    lowercase: true,
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer_not_to_say'],
  },

  // Seeded from onboarding quiz — used for cold start
  styleProfile: {
    preferredStyles:    { type: [String], default: [] },
    preferredColors:    { type: [String], default: [] },
    preferredFormality: { type: [String], default: [] },
    climate:            String,
  },

  onboardingCompleted: { type: Boolean, default: false },

  // 0 = cold start, 1 = some data, 2 = well personalized
  learningPhase: { type: Number, default: 0, min: 0, max: 2 },

  // Refresh tokens — stored to support multi-device and token revocation
  refreshTokens: [{ type: String, select: false }],

}, { timestamps: true })

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

userSchema.index({ email: 1 })
userSchema.index({ username: 1 })

export default mongoose.model('User', userSchema)
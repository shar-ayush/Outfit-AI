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
    select:   false,
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

  styleProfile: {
    preferredStyles:    { type: [String], default: [] },
    preferredColors:    { type: [String], default: [] },
    preferredFormality: { type: [String], default: [] },
    climate:            String,
  },

  onboardingCompleted: { type: Boolean, default: false },

  learningPhase: { type: Number, default: 0, min: 0, max: 2 },

  refreshTokens: [{ type: String, select: false }],

  resetPasswordToken:   { type: String, select: false },
  resetPasswordExpires: { type: Date, select: false },

}, { timestamps: true })

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return
  this.password = await bcrypt.hash(this.password, 12)
})

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

export default mongoose.model('User', userSchema)

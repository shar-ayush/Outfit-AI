import mongoose from 'mongoose'

const contextPreferenceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // e.g. 'office_formal', 'casual_hot', 'college_mild'
  contextKey: { type: String, required: true },

  occasion:    String,
  formality:   String,
  season:      String,
  weatherType: String,

  // Raw frequency counts — normalized on read
  colorFrequency:   { type: Map, of: Number, default: {} },
  styleFrequency:   { type: Map, of: Number, default: {} },
  patternFrequency: { type: Map, of: Number, default: {} },
  fitFrequency:     { type: Map, of: Number, default: {} },

  interactionCount: { type: Number, default: 0 },
  confidence:       { type: Number, default: 0.0 },

  lastUpdatedAt: Date,

}, { timestamps: true })

contextPreferenceSchema.index({ userId: 1, contextKey: 1 }, { unique: true })
contextPreferenceSchema.index({ userId: 1, occasion: 1 })

export default mongoose.model('ContextPreference', contextPreferenceSchema)
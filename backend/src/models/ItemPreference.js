import mongoose from 'mongoose'

const itemPreferenceSchema = new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clothId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cloth', required: true },

  score:      { type: Number, default: 0.5, min: 0.1, max: 1.0 },
  confidence: { type: Number, default: 0.0, min: 0.0, max: 1.0 },

  // Raw signal counts — never lose these
  signals: {
    worn:      { type: Number, default: 0 },
    saved:     { type: Number, default: 0 },
    rejected:  { type: Number, default: 0 },
    skipped:   { type: Number, default: 0 },
    shared:    { type: Number, default: 0 },
    rated:     { type: Number, default: 0 },
    ratingSum: { type: Number, default: 0 },
  },

  lastWornAt:         Date,
  lastRecommendedAt:  Date,
  lastInteractedAt:   Date,
  lastDecayAppliedAt: Date,

}, { timestamps: true })

itemPreferenceSchema.index({ userId: 1, clothId: 1 }, { unique: true })
itemPreferenceSchema.index({ userId: 1, score: -1 })
itemPreferenceSchema.index({ userId: 1, lastWornAt: 1 })

export default mongoose.model('ItemPreference', itemPreferenceSchema)
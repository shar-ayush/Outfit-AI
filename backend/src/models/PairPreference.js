import mongoose from 'mongoose'

const pairPreferenceSchema = new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Always stored in canonical order — enforced in service layer
  itemAId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cloth', required: true },
  itemBId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cloth', required: true },

  affinityScore: { type: Number, default: 0.0, min: -1.0, max: 1.0 },
  confidence:    { type: Number, default: 0.0, min: 0.0, max: 1.0 },

  signals: {
    wornTogether:     { type: Number, default: 0 },
    savedTogether:    { type: Number, default: 0 },
    rejectedTogether: { type: Number, default: 0 },
    shownTogether:    { type: Number, default: 0 },
  },

  lastSeenTogether:   Date,
  lastDecayAppliedAt: Date,

}, { timestamps: true })

pairPreferenceSchema.index({ userId: 1, itemAId: 1, itemBId: 1 }, { unique: true })
pairPreferenceSchema.index({ userId: 1, affinityScore: -1 })
pairPreferenceSchema.index({ userId: 1, itemAId: 1 })
pairPreferenceSchema.index({ userId: 1, itemBId: 1 })

export default mongoose.model('PairPreference', pairPreferenceSchema)
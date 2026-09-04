import mongoose from 'mongoose'

const outfitPlanSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  outfitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Outfit', required: true },
  date:     { type: Date, required: true, index: true },

  source: {
    type: String,
    enum: ['user_selected', 'recommendation', 'ai_generated'],
    required: true,
  },
  status: {
    type:    String,
    enum:    ['planned', 'worn', 'skipped', 'cancelled'],
    default: 'planned',
    index:   true,
  },

  occasion: String,
  notes:    String,
  wornAt:   Date,

}, { timestamps: true })

// One plan per user per day
outfitPlanSchema.index({ userId: 1, date: 1 }, { unique: true })
outfitPlanSchema.index({ userId: 1, status: 1, date: 1 })

export default mongoose.model('OutfitPlan', outfitPlanSchema)
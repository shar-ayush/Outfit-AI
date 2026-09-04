import mongoose from 'mongoose'

const wearLogItemSchema = new mongoose.Schema({
  clothId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cloth', required: true },
}, { _id: false })

const wearLogSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  outfitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Outfit', required: true },

  // Individual items — for item-level preference updates
  items: [wearLogItemSchema],

  // Context at time of wearing
  context: {
    occasion:    String,
    formality:   String,
    season:      String,
    dayOfWeek:   Number,
    temperature: Number,
    condition:   String,
  },

  rating:   { type: Number, min: 1, max: 5 },
  feedback: String,

  fromRecommendation: { type: Boolean, default: false },
  recommendationId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Recommendation' },

  wornAt: { type: Date, default: Date.now },

}, { timestamps: true })

wearLogSchema.index({ userId: 1, wornAt: -1 })
wearLogSchema.index({ userId: 1, outfitId: 1 })
wearLogSchema.index({ userId: 1, 'context.occasion': 1 })

export default mongoose.model('WearLog', wearLogSchema)
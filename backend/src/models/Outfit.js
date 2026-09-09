import mongoose from 'mongoose'

const outfitItemSchema = new mongoose.Schema({
  clothId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Cloth', required: true },
  role:     { type: String, enum: ['top','bottom','footwear','outerwear','accessory','full_body'] },
  position: { type: Number, default: 0 },
}, { _id: false })

const outfitSchema = new mongoose.Schema({
  userId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
    index:    true,
  },

  items: [outfitItemSchema],

  occasion:           String,
  formality:          String,
  style:              [String],
  season:             [String],
  weatherSuitability: [String],

  source: {
    type:     String,
    enum:     ['user_created', 'ai_generated', 'recommendation'],
    required: true,
  },

  compatibilityScore: Number,
  scoreBreakdown: {
    harmony:          Number,
    vectorSimilarity: Number,
    constraintMatch:  Number,
    pairsScored:      Number,
  },

  outfitName: String,
  whyItWorks: String,
  stylingTip: String,
  vibe:       String,

  isSaved:    { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false },

  wearCount:  { type: Number, default: 0 },
  lastWornAt: Date,

}, { timestamps: true })

outfitSchema.index({ userId: 1, createdAt: -1 })
outfitSchema.index({ userId: 1, isSaved: 1 })
outfitSchema.index({ userId: 1, source: 1 })

export default mongoose.model('Outfit', outfitSchema)
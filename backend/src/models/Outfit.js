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

  // Denormalized context
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

  // Compatibility scores stored at generation time.
  // Field names match compatibilityScorer.scoreOutfit()'s ACTUAL return
  // shape (see Step 4). Previously this stored color/style/formality/
  // occasion/pattern — fields scoreOutfit() never computed — so
  // scoreBreakdown was silently empty in the DB for every outfit ever
  // created. This is that fix.
  compatibilityScore: Number,
  scoreBreakdown: {
    harmony:          Number, // pairwise color/pattern/style/formality/occasion average, 0-100
    vectorSimilarity: Number, // 0-1, avg semantic similarity of items to the query
    constraintMatch:  Number, // 0-1, avg match to the user's explicit slot constraints
    pairsScored:      Number,
  },

  // AI metadata
  outfitName: String,
  whyItWorks: String,
  stylingTip: String,
  vibe:       String,

  // State
  isSaved:    { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false },

  // Wear tracking
  wearCount:  { type: Number, default: 0 },
  lastWornAt: Date,

}, { timestamps: true })

outfitSchema.index({ userId: 1, createdAt: -1 })
outfitSchema.index({ userId: 1, isSaved: 1 })
outfitSchema.index({ userId: 1, source: 1 })

export default mongoose.model('Outfit', outfitSchema)
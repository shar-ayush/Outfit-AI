import mongoose from 'mongoose'

const clothSchema = new mongoose.Schema({
  userId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
    index:    true,
  },

  // Images
  imageUrl:         { type: String, required: true },
  originalImageUrl: String,
  publicId:         String,

  // Classification
  category: {
    type:     String,
    enum:     ['top', 'bottom', 'footwear', 'outerwear', 'accessory', 'full_body'],
    required: true,
    index:    true,
  },
  subCategory: { type: String, index: true },

  // Color
  color: {
    primary:     String,
    secondary:   [String],
    hex:         String,
    colorFamily: String,
  },

  // Visual attributes
  pattern:  String,   // solid, stripe, check, floral, graphic
  fabric:   String,
  fit:      String,
  style:    [String],
  formality: {
    type:    String,
    enum:    ['casual', 'semi-formal', 'formal'],
    default: 'casual',
  },

  // Context
  season:             [String],
  occasions:          [String],
  weatherSuitability: [String],
  temperatureRange: {
    min: Number,
    max: Number,
  },

  // ROI tracking
  purchasePrice:    Number,
  purchaseCurrency: { type: String, default: 'INR' },
  purchaseDate:     Date,
  brand:            String,
  name:             String,
  notes:            String,

  // Computed from WearLogs
  wearCount:   { type: Number, default: 0 },
  lastWornAt:  Date,
  costPerWear: Number,

  // AI processing
  aiTagged:     { type: Boolean, default: false },
  aiConfidence: Number,

  // Vector embedding — select: false so it's excluded from normal queries
  embedding:          { type: [Number], select: false },
  embeddingText:      String,
  embeddingUpdatedAt: Date,

  // State
  isAvailable: { type: Boolean, default: true },
  isArchived:  { type: Boolean, default: false },

}, { timestamps: true })

clothSchema.index({ userId: 1, category: 1 })
clothSchema.index({ userId: 1, category: 1, formality: 1 })
clothSchema.index({ userId: 1, occasions: 1 })
clothSchema.index({ userId: 1, isAvailable: 1, isArchived: 1 })
clothSchema.index({ userId: 1, lastWornAt: 1 })

export default mongoose.model('Cloth', clothSchema)
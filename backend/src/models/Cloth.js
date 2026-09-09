import mongoose from 'mongoose'

const clothSchema = new mongoose.Schema({
  userId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
    index:    true,
  },

  imageUrl:         { type: String, required: true },
  originalImageUrl: String,
  publicId:         String,

  category: {
    type:     String,
    enum:     ['top', 'bottom', 'footwear', 'outerwear', 'accessory', 'full_body'],
    required: true,
    index:    true,
  },
  subCategory: { type: String, index: true },

  color: {
    primary:     String,
    secondary:   [String],
    hex:         String,
    colorFamily: String,
  },

  pattern:  String,
  fabric:   String,
  fit:      String,
  style:    [String],
  formality: {
    type:    String,
    enum:    ['casual', 'semi-formal', 'formal'],
    default: 'casual',
  },

  season:             [String],
  occasions:          [String],
  weatherSuitability: [String],
  temperatureRange: {
    min: Number,
    max: Number,
  },

  purchasePrice:    Number,
  purchaseCurrency: { type: String, default: 'INR' },
  purchaseDate:     Date,
  brand:            String,
  name:             String,
  notes:            String,

  wearCount:   { type: Number, default: 0 },
  lastWornAt:  Date,
  costPerWear: Number,

  aiTagged:     { type: Boolean, default: false },
  aiConfidence: Number,

  embedding:          { type: [Number], select: false },
  embeddingText:      String,
  embeddingUpdatedAt: Date,

  isAvailable: { type: Boolean, default: true },
  isArchived:  { type: Boolean, default: false },

}, { timestamps: true })

clothSchema.index({ userId: 1, category: 1 })
clothSchema.index({ userId: 1, category: 1, formality: 1 })
clothSchema.index({ userId: 1, occasions: 1 })
clothSchema.index({ userId: 1, isAvailable: 1, isArchived: 1 })
clothSchema.index({ userId: 1, lastWornAt: 1 })

export default mongoose.model('Cloth', clothSchema)
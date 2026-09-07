import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  role:      { type: String, enum: ['user', 'assistant'], required: true },
  content:   { type: String, required: true },
  outfitIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Outfit' }],
  timestamp: { type: Date, default: Date.now },
}, { _id: false })

const slotConstraintSchema = new mongoose.Schema({
  color:       String,
  subCategory: String,
  pattern:     String,
}, { _id: false })

const excludeConstraintSchema = new mongoose.Schema({
  slot:      String,
  attribute: String,
  value:     String,
}, { _id: false })

const conversationSessionSchema = new mongoose.Schema({
  userId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
    index:    true,
  },

  messages: [messageSchema],

  shownItemIds: [String],

  lastIntent: {
    occasions:          String,
    formality:          String,
    season:             String,
    weatherSuitability: String,
    style:              [String],

    // NEW — added in Step 1
    slotConstraints: {
      top:        slotConstraintSchema,
      bottom:     slotConstraintSchema,
      footwear:   slotConstraintSchema,
      outerwear:  slotConstraintSchema,
      accessory:  slotConstraintSchema,
      full_body:  slotConstraintSchema,
    },
    excludeConstraints: [excludeConstraintSchema],
    moodDescriptor:     String,
  },

}, { timestamps: true })

conversationSessionSchema.index({ userId: 1, updatedAt: -1 })

export default mongoose.model('ConversationSession', conversationSessionSchema)
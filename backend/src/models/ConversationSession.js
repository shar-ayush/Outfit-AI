import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  role:      { type: String, enum: ['user', 'assistant'], required: true },
  content:   { type: String, required: true },
  outfitIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Outfit' }],
  timestamp: { type: Date, default: Date.now },
}, { _id: false })

const conversationSessionSchema = new mongoose.Schema({
  userId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
    index:    true,
  },

  messages: [messageSchema],

  // Item IDs shown in this session — for novelty tracking
  shownItemIds: [String],

  // Last extracted intent — follow-up queries inherit this
  lastIntent: {
    occasions:          String,
    formality:          String,
    season:             String,
    weatherSuitability: String,
    style:              [String],
  },

}, { timestamps: true })

conversationSessionSchema.index({ userId: 1, updatedAt: -1 })

export default mongoose.model('ConversationSession', conversationSessionSchema)
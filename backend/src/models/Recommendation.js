import mongoose from 'mongoose'

const recommendationSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  outfitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Outfit', required: true },

  context: {
    occasion:    String,
    formality:   String,
    season:      String,
    dayOfWeek:   Number,
    query:       String,
    temperature: Number,
    condition:   String,
  },

  scores: {
    final:           Number,
    compatibility:   Number,
    personalization: Number,
    novelty:         Number,
    diversity:       Number,
    repetitionPenalty: Number,
  },

  position:     Number,
  learningPhase: Number,

  status: {
    type:    String,
    enum:    ['generated', 'shown', 'interacted', 'expired'],
    default: 'generated',
  },
  shownAt: Date,

}, { timestamps: true })

recommendationSchema.index({ userId: 1, createdAt: -1 })
recommendationSchema.index({ userId: 1, outfitId: 1 })
recommendationSchema.index({ userId: 1, status: 1 })

export default mongoose.model('Recommendation', recommendationSchema)
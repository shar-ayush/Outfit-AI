import mongoose from 'mongoose'

const dailyRecommendationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  date: {
    type: String,
    required: true,
    index: true,
  },
  outfitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Outfit',
    required: true,
  },
  recommendationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recommendation',
  },
  weatherAtRecommendation: {
    temperature: Number,
    condition: String,
  },
  message: String,
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ConversationSession',
  },
}, { timestamps: true })

dailyRecommendationSchema.index({ userId: 1, date: 1 }, { unique: true })

export default mongoose.model('DailyRecommendation', dailyRecommendationSchema)

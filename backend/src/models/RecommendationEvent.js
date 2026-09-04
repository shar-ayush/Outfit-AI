import mongoose from 'mongoose'

const recommendationEventSchema = new mongoose.Schema({
  userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  recommendationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Recommendation', required: true },
  outfitId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Outfit', required: true },

  eventType: {
    type:     String,
    enum:     ['shown','viewed','saved','worn','rejected','skipped','shared','rated'],
    required: true,
    index:    true,
  },

  value:    Number,  // rating value for 'rated' events
  position: Number,

  context: {
    occasion:    String,
    season:      String,
    dayOfWeek:   Number,
    temperature: Number,
    condition:   String,
  },

  timestamp: { type: Date, default: Date.now, index: true },

}, { timestamps: true })

recommendationEventSchema.index({ userId: 1, timestamp: -1 })
recommendationEventSchema.index({ recommendationId: 1, eventType: 1 })
recommendationEventSchema.index({ userId: 1, eventType: 1, timestamp: -1 })

export default mongoose.model('RecommendationEvent', recommendationEventSchema)
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
    final:             Number,
    compatibility:     Number, // pre-personalization algorithm score (harmony+vector+constraint blend)
    personalization:   Number,
    novelty:           Number,
    diversity:         Number,
    repetitionPenalty: Number,
    vectorSimilarity:  Number, // NEW — duplicated from outfit.score for recommendation-level analytics
    constraintMatch:   Number, // NEW
  },

  // NEW — independent verification result from Step 6.
  // satisfied: false + justification: null means an UNRESOLVED
  // violation even after the single retry — worth surfacing in
  // analytics as a signal the wardrobe couldn't fulfill a request.
  verification: {
    satisfied: Boolean,
    violations: [{
      slot:     String,
      expected: String,
      got:      String,
      type:     String, // 'constraint' | 'exclusion'
    }],
    justification: String,
  },

  // NEW — the composition step's OWN self-reported substitution
  // note (Step 5), kept separate from `verification` deliberately —
  // these come from two independent LLM calls, and comparing them
  // (does the model's own explanation match what the auditor found?)
  // is itself a useful debugging signal.
  substitutionNote: String,

  // NEW — full agentic retrieval trail from Step 3: every
  // searchWardrobe call made for this request, its args, and
  // whether constraints were relaxed to get results.
  retrievalTrail: [{
    callNumber:   Number,
    category:     String,
    args:         mongoose.Schema.Types.Mixed,
    resultCount:  Number,
    usedFallback: Boolean,
    capped:       Boolean,
    forcedFloor:  Boolean,
    error:        String,
  }],

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
import Outfit from '../models/Outfit.js'
import Recommendation from '../models/Recommendation.js'
import RecommendationEvent from '../models/RecommendationEvent.js'
import ConversationSession from '../models/ConversationSession.js'
import { extractIntent } from './ai/intentService.js'
import { hybridRetrieval } from './recommendation/hybridRetrieval.js'
import { rankCandidates } from './recommendation/rankingService.js'
import { processSignal } from './learning/signalProcessor.js'
import ApiError from '../utils/ApiError.js'
import mongoose from 'mongoose'

// ─────────────────────────────────────────────
// Get outfit recommendations
// Full hybrid pipeline:
// intent extraction → hybrid retrieval
// → compatibility scoring → personalization
// → novelty penalty → LLM re-ranking
// ─────────────────────────────────────────────

export async function getOutfitRecommendations({
  userId,
  query,
  sessionId  = null,
  count      = 3,
  weatherContext = null,
}) {
  const user = await (await import('../models/User.js')).default
    .findById(userId)
    .select('learningPhase')
    .lean()

  // Step 1 — extract intent from natural language
  // if sessionId exists load conversation history for follow-up context
  let conversationHistory = []
  let session             = null

  if (sessionId) {
    session             = await ConversationSession.findById(sessionId)
    conversationHistory = session?.messages || []
  }

  const intent = await extractIntent(query, conversationHistory)

  // Inject weather into intent if provided
  if (weatherContext) {
    if (!intent.weatherSuitability) {
      if (weatherContext.temperature > 28)      intent.weatherSuitability = 'hot'
      else if (weatherContext.temperature < 15) intent.weatherSuitability = 'cold'
      else                                       intent.weatherSuitability = 'mild'
    }
    if (!intent.season) {
      const month = new Date().getMonth()
      if (month >= 2  && month <= 4) intent.season = 'spring'
      else if (month >= 5 && month <= 7) intent.season = 'summer'
      else if (month >= 8 && month <= 10) intent.season = 'autumn'
      else intent.season = 'winter'
    }
  }

  // Step 2 — hybrid retrieval
  const candidatePool = await hybridRetrieval(userId, query, intent)

  if (candidatePool.isEmpty) {
    return {
      outfits:    [],
      message:    'Your wardrobe needs more items. Upload at least tops, bottoms and shoes.',
      sessionId,
      intent,
    }
  }

  // Items already shown in this session (for novelty)
  const shownItemIds = session?.shownItemIds || []

  // Step 3 — rank candidates through full pipeline
  const rankedOutfits = await rankCandidates({
    candidatePool,
    userId,
    userQuery:          query,
    intent,
    conversationHistory,
    shownItemIds,
    learningPhase:      user?.learningPhase || 0,
    count,
  })

  if (rankedOutfits.length === 0) {
    return {
      outfits:  [],
      message:  'Could not generate combinations. Try a different query.',
      sessionId,
      intent,
    }
  }

  // Step 4 — persist outfits and recommendations to DB
  const savedOutfits = await Promise.all(
    rankedOutfits.map(async (outfit, position) => {
      // Save outfit document
      const savedOutfit = await Outfit.create({
        userId,
        items: outfit.items.map((item, idx) => ({
          clothId:  item._id,
          role:     item.category,
          position: idx,
        })),
        occasion:   intent.occasions,
        formality:  intent.formality,
        style:      intent.style || [],
        source:     'recommendation',
        compatibilityScore: outfit.score?.total,
        scoreBreakdown: {
          color:     outfit.score?.color,
          style:     outfit.score?.style,
          formality: outfit.score?.formality,
          occasion:  outfit.score?.occasion,
          pattern:   outfit.score?.pattern,
        },
        outfitName: outfit.outfitName,
        whyItWorks: outfit.whyItWorks,
        stylingTip: outfit.stylingTip,
        vibe:       outfit.vibe,
      })

      // Save recommendation record with full score breakdown
      const recommendation = await Recommendation.create({
        userId,
        outfitId: savedOutfit._id,
        context: {
          occasion:    intent.occasions,
          formality:   intent.formality,
          season:      intent.season,
          dayOfWeek:   new Date().getDay(),
          query,
          temperature: weatherContext?.temperature,
          condition:   weatherContext?.condition,
        },
        scores: {
          final:             outfit.score?.total,
          compatibility:     outfit.score?.algorithm,
          personalization:   outfit.score?.personalization,
          novelty:           outfit.score?.noveltyPenalty,
        },
        position,
        learningPhase: user?.learningPhase || 0,
        status:  'shown',
        shownAt: new Date(),
      })

      // Log shown event
      await RecommendationEvent.create({
        userId,
        recommendationId: recommendation._id,
        outfitId:         savedOutfit._id,
        eventType:        'shown',
        position,
        context: {
          occasion:  intent.occasions,
          dayOfWeek: new Date().getDay(),
          temperature: weatherContext?.temperature,
        },
        timestamp: new Date(),
      })

      return {
        ...outfit,
        outfitId:         savedOutfit._id,
        recommendationId: recommendation._id,
        items:            outfit.items.map(item => ({
          _id:        item._id,
          imageUrl:   item.imageUrl,
          category:   item.category,
          color:      item.color,
          style:      item.style,
          formality:  item.formality,
          subCategory: item.subCategory,
        })),
      }
    })
  )

  // Step 5 — update conversation session
  const allShownItemIds = [
    ...shownItemIds,
    ...rankedOutfits.flatMap(o => o.items.map(i => i._id.toString())),
  ]

  if (session) {
    session.messages.push(
      { role: 'user',      content: query },
      {
        role:     'assistant',
        content:  savedOutfits.map(o => o.outfitName).join(', '),
        outfitIds: savedOutfits.map(o => o.outfitId),
      }
    )
    session.messages    = session.messages.slice(-20)
    session.shownItemIds = allShownItemIds.slice(-100)
    session.lastIntent   = intent
    await session.save()
  } else {
    // Create new session
    const newSession = await ConversationSession.create({
      userId,
      messages: [
        { role: 'user',      content: query },
        {
          role:     'assistant',
          content:  savedOutfits.map(o => o.outfitName).join(', '),
          outfitIds: savedOutfits.map(o => o.outfitId),
        },
      ],
      shownItemIds: allShownItemIds.slice(-100),
      lastIntent:   intent,
    })
    session = newSession
  }

  return {
    outfits:   savedOutfits,
    sessionId: session._id,
    intent,
    meta: {
      candidatePoolSize: Object.values(candidatePool)
        .filter(Array.isArray)
        .reduce((sum, arr) => sum + arr.length, 0),
      wasRelaxed:   candidatePool.wasRelaxed,
      relaxLevel:   candidatePool.relaxLevel,
      learningPhase: user?.learningPhase || 0,
    },
  }
}

// ─────────────────────────────────────────────
// Record user action on an outfit
// Triggers the learning pipeline
// ─────────────────────────────────────────────

export async function recordOutfitAction({
  userId,
  outfitId,
  recommendationId,
  eventType,
  rating   = null,
  feedback = null,
  context  = {},
}) {
  const outfit = await Outfit.findOne({ _id: outfitId, userId })
  if (!outfit) throw new ApiError(404, 'Outfit not found')

  // Log the recommendation event
  if (recommendationId) {
    await RecommendationEvent.create({
      userId,
      recommendationId,
      outfitId,
      eventType,
      value:    rating,
      context: {
        occasion:  context.occasion,
        dayOfWeek: new Date().getDay(),
        temperature: context.temperature,
      },
      timestamp: new Date(),
    })

    // Update recommendation status
    await Recommendation.findByIdAndUpdate(recommendationId, {
      status: 'interacted',
    })
  }

  // Save outfit if action is save
  if (eventType === 'saved') {
    await Outfit.findByIdAndUpdate(outfitId, { isSaved: true })
  }

  // Trigger learning pipeline
  await processSignal({
    userId,
    outfitId,
    eventType,
    rating,
    context,
  })

  return { success: true, eventType, outfitId }
}

// ─────────────────────────────────────────────
// Get saved outfits
// ─────────────────────────────────────────────

export async function getSavedOutfits(userId, query = {}) {
  const { page = 1, limit = 10 } = query
  const skip = (parseInt(page) - 1) * parseInt(limit)

  const [outfits, total] = await Promise.all([
    Outfit.find({ userId, isSaved: true, isArchived: false })
          .populate({
            path:   'items.clothId',
            select: 'imageUrl category color style formality subCategory',
          })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
    Outfit.countDocuments({ userId, isSaved: true, isArchived: false }),
  ])

  return {
    outfits,
    pagination: {
      total,
      page:       parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  }
}

// ─────────────────────────────────────────────
// Get a single outfit by ID
// ─────────────────────────────────────────────

export async function getOutfitById(outfitId, userId) {
  const outfit = await Outfit.findOne({ _id: outfitId, userId })
    .populate({
      path:   'items.clothId',
      select: '-embedding',
    })
    .lean()

  if (!outfit) throw new ApiError(404, 'Outfit not found')
  return outfit
}

// ─────────────────────────────────────────────
// Delete saved outfit
// ─────────────────────────────────────────────

export async function deleteOutfit(outfitId, userId) {
  const outfit = await Outfit.findOneAndUpdate(
    { _id: outfitId, userId },
    { isArchived: true, isSaved: false },
    { new: true }
  )

  if (!outfit) throw new ApiError(404, 'Outfit not found')
  return { deleted: true, outfitId }
}
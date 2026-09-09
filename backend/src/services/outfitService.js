import Outfit from '../models/Outfit.js'
import Cloth from '../models/Cloth.js'
import Recommendation from '../models/Recommendation.js'
import RecommendationEvent from '../models/RecommendationEvent.js'
import ConversationSession from '../models/ConversationSession.js'
import DailyRecommendation from '../models/DailyRecommendation.js'
import { extractIntent } from './ai/intentService.js'
import { hybridRetrieval } from './recommendation/hybridRetrieval.js'
import { rankCandidates } from './recommendation/rankingService.js'
import { processSignal } from './learning/signalProcessor.js'
import ApiError from '../utils/ApiError.js'
import mongoose from 'mongoose'

export async function getOutfitRecommendations({
  userId,
  query,
  sessionId = null,
  session = null,
  precomputedIntent = null,
  count = 3,
  weatherContext = null,
}) {
  const user = await (await import('../models/User.js')).default
    .findById(userId)
    .select('learningPhase')
    .lean()

  const totalClothes = await Cloth.countDocuments({ userId, isArchived: false })
  if (totalClothes === 0) {
    return {
      outfits: [],
      message: 'Your wardrobe needs more items. Upload at least tops, bottoms and shoes.',
      sessionId,
      intent: precomputedIntent || null,
    }
  }

  if (!session && sessionId) {
    session = await ConversationSession.findById(sessionId)
  }
  const conversationHistory = session?.messages || []

  const intent = precomputedIntent || await extractIntent(query, conversationHistory)

  if (weatherContext) {
    if (!intent.weatherSuitability) {
      if (weatherContext.temperature > 28) intent.weatherSuitability = 'hot'
      else if (weatherContext.temperature < 15) intent.weatherSuitability = 'cold'
      else intent.weatherSuitability = 'mild'
    }
    if (!intent.season) {
      const month = new Date().getMonth()
      if (month >= 2 && month <= 4) intent.season = 'spring'
      else if (month >= 5 && month <= 7) intent.season = 'summer'
      else if (month >= 8 && month <= 10) intent.season = 'autumn'
      else intent.season = 'winter'
    }
  }

  const candidatePool = await hybridRetrieval(userId, query, intent)

  if (candidatePool.isEmpty) {
    return {
      outfits: [],
      message: 'Your wardrobe needs more items. Upload at least tops, bottoms and shoes.',
      sessionId,
      intent,
    }
  }

  const shownItemIds = session?.shownItemIds || []

  const rankedOutfits = await rankCandidates({
    candidatePool,
    userId,
    userQuery: query,
    intent,
    conversationHistory,
    shownItemIds,
    learningPhase: user?.learningPhase || 0,
    count,
  })

  if (rankedOutfits.length === 0) {
    return {
      outfits: [],
      message: 'Could not generate combinations. Try a different query.',
      sessionId,
      intent,
    }
  }

  const savedOutfits = await Promise.all(
    rankedOutfits.map(async (outfit, position) => {
      const savedOutfit = await Outfit.create({
        userId,
        items: outfit.items.map((item, idx) => ({
          clothId: item._id,
          role: item.category,
          position: idx,
        })),
        occasion: intent.occasions,
        formality: intent.formality,
        style: intent.style || [],
        source: 'recommendation',
        compatibilityScore: outfit.score?.total,
        scoreBreakdown: {
          harmony: outfit.score?.harmony,
          vectorSimilarity: outfit.score?.vectorSimilarity,
          constraintMatch: outfit.score?.constraintMatch,
          pairsScored: outfit.score?.pairsScored,
        },
        outfitName: outfit.outfitName,
        whyItWorks: outfit.whyItWorks,
        stylingTip: outfit.stylingTip,
        vibe: outfit.vibe,
      })

      const recommendation = await Recommendation.create({
        userId,
        outfitId: savedOutfit._id,
        context: {
          occasion: intent.occasions,
          formality: intent.formality,
          season: intent.season,
          dayOfWeek: new Date().getDay(),
          query,
          temperature: weatherContext?.temperature,
          condition: weatherContext?.condition,
        },
        scores: {
          final: outfit.score?.total,
          compatibility: outfit.score?.algorithm,
          personalization: outfit.score?.personalization,
          novelty: outfit.score?.noveltyPenalty,
          vectorSimilarity: outfit.score?.vectorSimilarity,
          constraintMatch: outfit.score?.constraintMatch,
        },
        verification: outfit.verification || null,
        substitutionNote: outfit.substitutionNote || null,
        retrievalTrail: candidatePool.retrievalTrail || [],
        position,
        learningPhase: user?.learningPhase || 0,
        status: 'shown',
        shownAt: new Date(),
      })

      await RecommendationEvent.create({
        userId,
        recommendationId: recommendation._id,
        outfitId: savedOutfit._id,
        eventType: 'shown',
        position,
        context: {
          occasion: intent.occasions,
          dayOfWeek: new Date().getDay(),
          temperature: weatherContext?.temperature,
        },
        timestamp: new Date(),
      })

      return {
        ...outfit,
        outfitId: savedOutfit._id.toString(),
        recommendationId: recommendation._id.toString(),
        isSaved: Boolean(savedOutfit.isSaved),
        items: outfit.items.map(item => ({
          _id: (item._id?.toString ? item._id.toString() : item._id),
          imageUrl: item.imageUrl,
          category: item.category,
          color: item.color,
          style: item.style,
          formality: item.formality,
          subCategory: item.subCategory,
        })),
      }
    })
  )

  const allShownItemIds = [
    ...shownItemIds,
    ...rankedOutfits.flatMap(o => o.items.map(i => i._id.toString())),
  ]

  const assistantMessageContent = savedOutfits.map((o, idx) => {
    const items = o.items.map(it => `${it.color?.primary || ''} ${it.subCategory || it.category}`).filter(Boolean).join(', ')
    return `Outfit ${idx + 1} (${o.outfitName}): ${items}`
  }).join('. ')

  if (session) {
    session.messages.push(
      { role: 'user', content: query },
      {
        role: 'assistant',
        content: assistantMessageContent,
        outfitIds: savedOutfits.map(o => o.outfitId),
      }
    )
    session.messages = session.messages.slice(-20)
    session.shownItemIds = allShownItemIds.slice(-100)
    session.lastIntent = intent
    await session.save()
  } else {
    const newSession = await ConversationSession.create({
      userId,
      messages: [
        { role: 'user', content: query },
        {
          role: 'assistant',
          content: assistantMessageContent,
          outfitIds: savedOutfits.map(o => o.outfitId),
        },
      ],
      shownItemIds: allShownItemIds.slice(-100),
      lastIntent: intent,
    })
    session = newSession
  }

  return {
    outfits: savedOutfits,
    sessionId: session._id.toString(),
    intent,
    meta: {
      candidatePoolSize: Object.values(candidatePool)
        .filter(Array.isArray)
        .reduce((sum, arr) => sum + arr.length, 0),
      wasRelaxed:    candidatePool.wasRelaxed,
      retrievalMode: candidatePool.agenticLoopUsed ? 'agentic' : 'fixed_filter_fallback',
      relaxLevel:    candidatePool.relaxLevel ?? null,
      toolCallCount: candidatePool.retrievalTrail?.length ?? 0,
      learningPhase: user?.learningPhase || 0,
    },
  }
}

export async function recordOutfitAction({
  userId,
  outfitId,
  recommendationId,
  eventType,
  rating = null,
  feedback = null,
  context = {},
}) {
  const outfit = await Outfit.findOne({ _id: outfitId, userId })
  if (!outfit) throw new ApiError(404, 'Outfit not found')

  if (eventType === 'saved') {
    await Outfit.findByIdAndUpdate(outfitId, { isSaved: true })
  } else if (eventType === 'unsaved' || eventType === 'unsave') {
    await Outfit.findByIdAndUpdate(outfitId, { isSaved: false })
  }

  await processSignal({
    userId,
    outfitId,
    eventType,
    rating,
    context,
    recommendationId,
  })

  return { success: true, eventType, outfitId }
}

export async function getSavedOutfits(userId, query = {}) {
  const { page = 1, limit = 10 } = query
  const skip = (parseInt(page) - 1) * parseInt(limit)

  const [outfits, total] = await Promise.all([
    Outfit.find({ userId, isSaved: true, isArchived: false })
      .populate({
        path: 'items.clothId',
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
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  }
}

export async function getOutfitById(outfitId, userId) {
  const outfit = await Outfit.findOne({ _id: outfitId, userId })
    .populate({
      path: 'items.clothId',
      select: '-embedding',
    })
    .lean()

  if (!outfit) throw new ApiError(404, 'Outfit not found')
  return outfit
}

export async function getRecommendationByOutfitId(outfitId, userId) {
  const recommendation = await Recommendation.findOne({ outfitId, userId })
    .sort({ createdAt: -1 })
    .lean()

  return recommendation
}

export async function deleteOutfit(outfitId, userId, permanent = false) {
  if (permanent) {
    const outfit = await Outfit.findOneAndDelete({ _id: outfitId, userId })
    if (!outfit) throw new ApiError(404, 'Outfit not found')
    await DailyRecommendation.updateMany({ userId, outfitId }, { $unset: { outfitId: 1 } })
    return { deleted: true, permanent: true, outfitId }
  }

  const outfit = await Outfit.findOneAndUpdate(
    { _id: outfitId, userId },
    { isArchived: true, isSaved: false },
    { new: true }
  )

  if (!outfit) throw new ApiError(404, 'Outfit not found')
  return { deleted: true, permanent: false, outfitId }
}

export async function createCustomOutfit(userId, { items, outfitName, occasion, formality, isSaved = true }) {
  if (!items || !items.length) {
    throw new ApiError(400, 'Outfit must include at least one clothing item')
  }

  const clothIds = items.map((it) => (typeof it === 'string' ? it : it.clothId))
  const clothes = await Cloth.find({ _id: { $in: clothIds }, userId }).lean()
  if (clothes.length !== clothIds.length) {
    throw new ApiError(400, 'One or more selected items were not found in your wardrobe')
  }

  const clothMap = new Map(clothes.map((c) => [c._id.toString(), c]))

  const formattedItems = items.map((item, index) => {
    const id = typeof item === 'string' ? item : item.clothId
    const cloth = clothMap.get(id.toString())
    return {
      clothId: cloth._id,
      role: item.role || cloth.category,
      position: item.position !== undefined ? item.position : index,
    }
  })

  const styles = [...new Set(clothes.flatMap((c) => c.style || []))]
  const seasons = [...new Set(clothes.flatMap((c) => c.season || []))]

  const outfit = await Outfit.create({
    userId,
    items: formattedItems,
    outfitName: outfitName?.trim() || 'Custom Outfit',
    occasion: occasion || 'casual',
    formality: formality || clothes[0]?.formality || 'casual',
    style: styles,
    season: seasons,
    source: 'user_created',
    isSaved: isSaved !== false,
  })

  return await Outfit.findById(outfit._id)
    .populate({
      path: 'items.clothId',
      select: '-embedding',
    })
    .lean()
}

function formatDailyOutfitForClient(outfitDoc, recommendationId) {
  if (!outfitDoc) return null
  return {
    outfitId: outfitDoc._id.toString(),
    recommendationId: recommendationId?.toString() || null,
    outfitName: outfitDoc.outfitName,
    whyItWorks: outfitDoc.whyItWorks,
    stylingTip: outfitDoc.stylingTip,
    vibe: outfitDoc.vibe,
    occasion: outfitDoc.occasion,
    formality: outfitDoc.formality,
    isSaved: Boolean(outfitDoc.isSaved),
    items: (outfitDoc.items || []).map((item) => {
      const cloth = item.clothId || item
      return {
        _id: cloth._id?.toString ? cloth._id.toString() : cloth._id,
        imageUrl: cloth.imageUrl,
        category: cloth.category,
        subCategory: cloth.subCategory,
        color: cloth.color,
        style: cloth.style,
        formality: cloth.formality,
        role: item.role || cloth.category,
      }
    }),
  }
}

function buildDailyPrompt(date, weatherContext, reason = null) {
  const d = new Date(date)
  const dayName = d.toLocaleDateString('en-US', { weekday: 'long' })
  const dayOfWeek = d.getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
  const isFriday = dayOfWeek === 5

  const dayVibe = isWeekend
    ? 'relaxed weekend leisure or casual outing'
    : isFriday
      ? 'smart casual Friday or effortless workday transition'
      : 'sharp, stylish weekday look suitable for everyday confidence'

  let weatherDesc = 'pleasant weather'
  if (weatherContext && weatherContext.temperature !== undefined) {
    const temp = Math.round(weatherContext.temperature)
    const cond = weatherContext.condition ? weatherContext.condition.toLowerCase() : ''
    weatherDesc = `${temp}°C${cond ? `, ${cond}` : ''}`
  }

  if (reason === 'rain') {
    return `Weather update: Rain detected (${weatherDesc}). Suggest a stylish weather-ready outfit for ${dayName}, prioritizing closed footwear and comfortable layers suitable for wet conditions.`
  }
  if (reason === 'temp_warm') {
    return `Weather update: Warmed up to ${weatherDesc}. Suggest a lighter, breathable, chic outfit for ${dayName}.`
  }
  if (reason === 'temp_cold') {
    return `Weather update: Cooled down to ${weatherDesc}. Suggest a cozier, well-layered outfit for ${dayName} keeping warmth in mind.`
  }

  return `Suggest an effortless, well-coordinated outfit for ${dayName} (${dayVibe}). Current weather is ${weatherDesc}. Focus on visual harmony, balance, and everyday style.`
}

export function buildDailyStylistNote(outfit, dayName) {
  if (!outfit) return null
  const vibe = outfit.vibe || 'Chic'
  const primaryItem = outfit.items?.[0]
  const itemDesc = primaryItem ? `${primaryItem.color?.primary || ''} ${primaryItem.subCategory || primaryItem.category || ''}`.trim() : ''

  if (outfit.whyItWorks) {
    return `${dayName}'s Look: ${outfit.whyItWorks}`
  }
  if (itemDesc) {
    return `${dayName} styling: Anchored around your ${itemDesc} for an effortless ${vibe.toLowerCase()} vibe.`
  }
  return `Curated for your ${dayName}: An effortless ${vibe.toLowerCase()} look tailored to today's weather.`
}

export async function getOrCreateDailyRecommendation({ userId, date, weatherContext = null }) {
  if (!date) {
    throw new ApiError(400, 'Date string (YYYY-MM-DD) is required')
  }

  const existingDaily = await DailyRecommendation.findOne({ userId, date })
    .populate({
      path: 'outfitId',
      populate: {
        path: 'items.clothId',
        select: '-embedding',
      },
    })
    .lean()

  if (existingDaily && existingDaily.outfitId) {
    return {
      outfit: formatDailyOutfitForClient(existingDaily.outfitId, existingDaily.recommendationId),
      recommendationId: existingDaily.recommendationId?.toString() || null,
      weatherAtRecommendation: existingDaily.weatherAtRecommendation || null,
      message: existingDaily.message || null,
      sessionId: existingDaily.sessionId?.toString() || null,
      isNew: false,
    }
  }

  const totalClothes = await Cloth.countDocuments({ userId, isArchived: false })
  if (totalClothes === 0) {
    return {
      outfit: null,
      recommendationId: null,
      weatherAtRecommendation: weatherContext
        ? { temperature: weatherContext.temperature, condition: weatherContext.condition }
        : null,
      message: 'Add a few wardrobe items to get your first outfit suggestion.',
      sessionId: null,
      isNew: false,
    }
  }

  const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' })
  const query = buildDailyPrompt(date, weatherContext)

  const result = await getOutfitRecommendations({
    userId,
    query,
    count: 1,
    weatherContext,
  })

  const outfit = result.outfits?.[0] || null
  const stylistMessage = buildDailyStylistNote(outfit, dayName)

  if (outfit) {
    const created = await DailyRecommendation.findOneAndUpdate(
      { userId, date },
      {
        userId,
        date,
        outfitId: outfit.outfitId,
        recommendationId: outfit.recommendationId,
        weatherAtRecommendation: weatherContext
          ? { temperature: weatherContext.temperature, condition: weatherContext.condition }
          : null,
        message: stylistMessage,
        sessionId: result.sessionId || null,
      },
      { upsert: true, new: true }
    )

    return {
      outfit,
      recommendationId: outfit.recommendationId,
      weatherAtRecommendation: created.weatherAtRecommendation || null,
      message: stylistMessage,
      sessionId: result.sessionId?.toString() || null,
      isNew: true,
    }
  }

  return {
    outfit: null,
    recommendationId: null,
    weatherAtRecommendation: weatherContext
      ? { temperature: weatherContext.temperature, condition: weatherContext.condition }
      : null,
    message: result.message || 'No items available to suggest an outfit.',
    sessionId: result.sessionId?.toString() || null,
    isNew: true,
  }
}

export async function refreshDailyRecommendation({ userId, date, weatherContext = null, reason = null }) {
  if (!date) {
    throw new ApiError(400, 'Date string (YYYY-MM-DD) is required')
  }

  const totalClothes = await Cloth.countDocuments({ userId, isArchived: false })
  if (totalClothes === 0) {
    return {
      outfit: null,
      recommendationId: null,
      weatherAtRecommendation: weatherContext
        ? { temperature: weatherContext.temperature, condition: weatherContext.condition }
        : null,
      message: 'Add a few wardrobe items to get your first outfit suggestion.',
      sessionId: null,
    }
  }

  const existing = await DailyRecommendation.findOne({ userId, date })
  const sessionId = existing?.sessionId || null

  const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' })
  const query = buildDailyPrompt(date, weatherContext, reason)

  const result = await getOutfitRecommendations({
    userId,
    query,
    sessionId,
    count: 1,
    weatherContext,
  })

  const outfit = result.outfits?.[0] || null
  const stylistMessage = buildDailyStylistNote(outfit, dayName)

  if (outfit) {
    const updated = await DailyRecommendation.findOneAndUpdate(
      { userId, date },
      {
        userId,
        date,
        outfitId: outfit.outfitId,
        recommendationId: outfit.recommendationId,
        weatherAtRecommendation: weatherContext
          ? { temperature: weatherContext.temperature, condition: weatherContext.condition }
          : null,
        message: stylistMessage,
        sessionId: result.sessionId || sessionId,
      },
      { upsert: true, new: true }
    )

    return {
      outfit,
      recommendationId: outfit.recommendationId,
      weatherAtRecommendation: updated.weatherAtRecommendation || null,
      message: stylistMessage,
      sessionId: result.sessionId?.toString() || null,
    }
  }

  return {
    outfit: null,
    recommendationId: null,
    weatherAtRecommendation: weatherContext
      ? { temperature: weatherContext.temperature, condition: weatherContext.condition }
      : null,
    message: result.message || 'Could not generate a new outfit suggestion.',
    sessionId: result.sessionId?.toString() || null,
  }
}

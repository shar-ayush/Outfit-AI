import ConversationSession from '../models/ConversationSession.js'
import DailyRecommendation from '../models/DailyRecommendation.js'
import { getOutfitRecommendations, buildDailyStylistNote } from './outfitService.js'
import { extractIntent } from './ai/intentService.js'
import { mergeIntent } from '../utils/intentMerge.js'
import { getGenerativeModel } from '../config/gemini.js'
import ApiError from '../utils/ApiError.js'

function buildOutfitResponseMessage(outfits, requestedCount = 3) {
  if (outfits.length === 0) return null

  let base = `Here are ${outfits.length} distinct outfits based on your wardrobe.`
  if (outfits.length === 1) {
    if (requestedCount === 1) {
      base = 'Here is an outfit tailored to your request.'
    } else {
      base = 'Here is the best outfit matching your request from your current wardrobe.'
    }
  }

  const substitutions = outfits
    .map((outfit, i) => ({ index: i, note: outfit.substitutionNote }))
    .filter(o => o.note)

  if (substitutions.length === 0) return base

  const notes = substitutions
    .map(s => (outfits.length > 1 ? `Outfit ${s.index + 1}: ${s.note}` : s.note))
    .join(' ')

  return `${base} A couple of notes on fit to your request — ${notes}`
}

export async function handleStylistMessage({
  userId,
  message,
  sessionId    = null,
  weatherContext = null,
}) {
  let session = null
  if (sessionId) {
    session = await ConversationSession.findById(sessionId)
  }

  const conversationHistory = session?.messages || []

  const rawIntent = await extractIntent(message, conversationHistory)

  const intent = mergeIntent(session?.lastIntent, rawIntent)

  if (intent.messageType === 'unrelated') {
    return handleUnrelatedQuery({ userId, message, session, sessionId })
  }

  if (intent.messageType === 'fashion_question') {
    return handleFashionQuestion({ userId, message, session, sessionId })
  }

  const targetCount = intent.requestedCount || 3

  const result = await getOutfitRecommendations({
    userId,
    query:   message,
    sessionId,
    session,
    precomputedIntent: intent,
    count:   targetCount,
    weatherContext,
  })

  let dailyUpdated = false
  if (result.outfits && result.outfits.length > 0) {
    const todayStr = new Date().toISOString().slice(0, 10)
    const effectiveSessionId = result.sessionId || sessionId || session?._id

    let dailyRec = await DailyRecommendation.findOne({
      userId,
      sessionId: effectiveSessionId,
    })

    if (!dailyRec && (intent.isRefinement || /today/i.test(message))) {
      dailyRec = await DailyRecommendation.findOne({
        userId,
        date: todayStr,
      })
    }

    if (dailyRec) {
      const chosenOutfit = result.outfits[0]
      const d = new Date(dailyRec.date || todayStr)
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' })
      const stylistMessage = buildDailyStylistNote(chosenOutfit, dayName)

      dailyRec.outfitId = chosenOutfit.outfitId || chosenOutfit._id
      dailyRec.recommendationId = chosenOutfit.recommendationId || null
      if (stylistMessage) {
        dailyRec.message = stylistMessage
      }
      if (effectiveSessionId && !dailyRec.sessionId) {
        dailyRec.sessionId = effectiveSessionId
      }
      await dailyRec.save()
      dailyUpdated = true
    }
  }

  return {
    type:         'outfits',
    outfits:      result.outfits,
    sessionId:    result.sessionId,
    intent:       result.intent,
    dailyUpdated,
    message:      result.outfits.length > 0
      ? buildOutfitResponseMessage(result.outfits, targetCount)
      : result.message,
  }
}

async function handleUnrelatedQuery({ userId, message, session, sessionId }) {
  const answer = "I'm your personal fashion stylist! I specialize only in clothing, styling advice, and outfit recommendations from your wardrobe. I can't assist with non-fashion topics, but feel free to ask me for outfit ideas, style tips, or what to wear!"

  if (session) {
    session.messages.push(
      { role: 'user',      content: message },
      { role: 'assistant', content: answer }
    )
    session.messages = session.messages.slice(-20)
    await session.save()
  } else {
    session = await ConversationSession.create({
      userId,
      messages: [
        { role: 'user',      content: message },
        { role: 'assistant', content: answer },
      ],
      shownItemIds: [],
    })
  }

  return {
    type:      'text',
    message:   answer,
    outfits:   [],
    sessionId: session?._id || sessionId,
  }
}

async function handleFashionQuestion({ userId, message, session, sessionId }) {
  const model = getGenerativeModel()

  const history = session?.messages.slice(-6) || []
  const historyText = history
    .map(m => `${m.role === 'user' ? 'User' : 'Stylist'}: ${m.content}`)
    .join('\n')

  const prompt = `
You are a knowledgeable personal stylist AI.
You specialize strictly and exclusively in fashion, clothing, styling, and wardrobe advice.
If the user's query is unrelated to fashion, do NOT answer the unrelated question. Instead, politely decline and remind them that you can only assist with fashion, styling, and wardrobe queries.
Otherwise, answer the user's fashion question concisely and helpfully.
Be specific and practical.

${historyText ? `Conversation context:\n${historyText}\n` : ''}
User: ${message}

Keep your answer under 150 words. Be conversational and friendly.
  `

  const result = await model.generateContent(prompt)
  const answer = result.response.text()

  if (session) {
    session.messages.push(
      { role: 'user',      content: message },
      { role: 'assistant', content: answer }
    )
    session.messages = session.messages.slice(-20)
    await session.save()
  } else {
    session = await ConversationSession.create({
      userId,
      messages: [
        { role: 'user',      content: message },
        { role: 'assistant', content: answer },
      ],
      shownItemIds: [],
    })
  }

  return {
    type:      'text',
    message:   answer,
    outfits:   [],
    sessionId: session?._id || sessionId,
  }
}

export async function getOrCreateSession(userId, sessionId = null) {
  if (sessionId) {
    const session = await ConversationSession.findOne({
      _id:    sessionId,
      userId,
    })
    if (session) return session
  }

  return ConversationSession.create({
    userId,
    messages:    [],
    shownItemIds: [],
  })
}

export async function getSessionHistory(sessionId, userId) {
  const session = await ConversationSession.findOne({
    _id: sessionId,
    userId,
  })
    .populate({
      path: 'messages.outfitIds',
      populate: {
        path: 'items.clothId',
        select: '-embedding',
      },
    })
    .lean()

  if (!session) throw new ApiError(404, 'Session not found')

  const formattedMessages = (session.messages || []).map(msg => {
    if (msg.outfitIds && msg.outfitIds.length > 0 && typeof msg.outfitIds[0] === 'object') {
      const outfits = msg.outfitIds.filter(Boolean).map(o => ({
        outfitId: o._id?.toString(),
        _id: o._id?.toString(),
        outfitName: o.outfitName,
        whyItWorks: o.whyItWorks,
        stylingTip: o.stylingTip,
        vibe: o.vibe,
        occasion: o.occasion,
        formality: o.formality,
        isSaved: Boolean(o.isSaved),
        items: (o.items || []).map(it => {
          const c = it.clothId || it
          return {
            _id: c._id?.toString ? c._id.toString() : c._id,
            imageUrl: c.imageUrl,
            category: c.category,
            subCategory: c.subCategory,
            color: c.color,
            style: c.style,
            formality: c.formality,
            role: it.role || c.category,
          }
        }),
      }))

      return {
        ...msg,
        type: 'outfits',
        outfits,
      }
    }

    return {
      ...msg,
      type: msg.role === 'assistant' ? 'text' : undefined,
    }
  })

  return {
    ...session,
    messages: formattedMessages,
  }
}

export async function getUserSessions(userId, { page = 1, limit = 10 } = {}) {
  const skip = (parseInt(page) - 1) * parseInt(limit)

  const [sessions, total] = await Promise.all([
    ConversationSession.find({ userId })
      .select('messages shownItemIds lastIntent updatedAt')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    ConversationSession.countDocuments({ userId }),
  ])

  return {
    sessions: sessions.map(s => ({
      ...s,
      messageCount: s.messages.length,
      lastMessage:  s.messages[s.messages.length - 1]?.content || '',
    })),
    pagination: {
      total,
      page:       parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  }
}

export async function clearSession(sessionId, userId) {
  const session = await ConversationSession.findOneAndUpdate(
    { _id: sessionId, userId },
    {
      $set: {
        messages:     [],
        shownItemIds: [],
        lastIntent:   {},
      },
    },
    { new: true }
  )

  if (!session) throw new ApiError(404, 'Session not found')
  return { cleared: true, sessionId }
}

export async function clearAllSessions(userId) {
  const result = await ConversationSession.deleteMany({ userId })
  return { deleted: true, count: result.deletedCount }
}
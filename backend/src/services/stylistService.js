import ConversationSession from '../models/ConversationSession.js'
import { getOutfitRecommendations } from './outfitService.js'
import { extractIntent } from './ai/intentService.js'
import { mergeIntent } from '../utils/intentMerge.js'
import { getGenerativeModel } from '../config/gemini.js'
import ApiError from '../utils/ApiError.js'

// ─────────────────────────────────────────────
// Builds an honest chat message that surfaces any
// constraint substitutions the pipeline made, rather
// than a generic "here are your outfits" line.
// This is the payoff of Steps 5/6 — the data existed,
// it just wasn't being said out loud until now.
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// Handle a stylist chat message
// Step 1 update: routing + intent merge now happen HERE,
// in a single extractIntent call, instead of a separate
// keyword-based classifyMessage() step.
// ─────────────────────────────────────────────

export async function handleStylistMessage({
  userId,
  message,
  sessionId    = null,
  weatherContext = null,
}) {
  // Load session once — reused for both branches below
  let session = null
  if (sessionId) {
    session = await ConversationSession.findById(sessionId)
  }

  const conversationHistory = session?.messages || []

  // Single Gemini call — classifies AND extracts intent
  const rawIntent = await extractIntent(message, conversationHistory)

  // Merge onto prior session intent if this is a refinement
  const intent = mergeIntent(session?.lastIntent, rawIntent)

  if (intent.messageType === 'fashion_question') {
    return handleFashionQuestion({ userId, message, session, sessionId })
  }

  const targetCount = intent.requestedCount || 3

  // Outfit request — run full recommendation pipeline
  // Pass the already-extracted+merged intent down so
  // getOutfitRecommendations doesn't call Gemini again
  const result = await getOutfitRecommendations({
    userId,
    query:   message,
    sessionId,
    session,
    precomputedIntent: intent,
    count:   targetCount,
    weatherContext,
  })

  return {
    type:      'outfits',
    outfits:   result.outfits,
    sessionId: result.sessionId,
    intent:    result.intent,
    message:   result.outfits.length > 0
      ? buildOutfitResponseMessage(result.outfits, targetCount)
      : result.message,
  }
}

// ─────────────────────────────────────────────
// Answer a general fashion question
// Unchanged in logic — just accepts an already-loaded session now
// ─────────────────────────────────────────────

async function handleFashionQuestion({ userId, message, session, sessionId }) {
  const model = getGenerativeModel()

  const history = session?.messages.slice(-6) || []
  const historyText = history
    .map(m => `${m.role === 'user' ? 'User' : 'Stylist'}: ${m.content}`)
    .join('\n')

  const prompt = `
You are a knowledgeable personal stylist AI.
Answer the user's fashion question concisely and helpfully.
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
  } else if (sessionId) {
    session = await ConversationSession.create({
      userId,
      messages: [
        { role: 'user',      content: message },
        { role: 'assistant', content: answer },
      ],
    })
  }

  return {
    type:      'text',
    message:   answer,
    outfits:   [],
    sessionId: session?._id || sessionId,
  }
}

// ─────────────────────────────────────────────
// Get or create a conversation session
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// Get session history
// ─────────────────────────────────────────────

export async function getSessionHistory(sessionId, userId) {
  const session = await ConversationSession.findOne({
    _id:    sessionId,
    userId,
  }).lean()

  if (!session) throw new ApiError(404, 'Session not found')

  return session
}

// ─────────────────────────────────────────────
// Get all sessions for a user (paginated)
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// Clear a session — start fresh conversation
// ─────────────────────────────────────────────

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
import ConversationSession from '../models/ConversationSession.js'
import { getOutfitRecommendations } from './outfitService.js'
import { getGenerativeModel } from '../config/gemini.js'
import ApiError from '../utils/ApiError.js'

// ─────────────────────────────────────────────
// Handle a stylist chat message
// The stylist chat IS the outfit recommendation
// system — same pipeline, with conversation memory
// ─────────────────────────────────────────────

export async function handleStylistMessage({
  userId,
  message,
  sessionId    = null,
  weatherContext = null,
}) {
  // Detect if this is a pure question vs an outfit request
  const isOutfitRequest = await classifyMessage(message)

  if (!isOutfitRequest) {
    // Pure fashion question — answer without generating outfits
    return handleFashionQuestion({ userId, message, sessionId })
  }

  // Outfit request — run full recommendation pipeline
  // Session management handled inside getOutfitRecommendations
  const result = await getOutfitRecommendations({
    userId,
    query:   message,
    sessionId,
    count:   3,
    weatherContext,
  })

  return {
    type:      'outfits',
    outfits:   result.outfits,
    sessionId: result.sessionId,
    intent:    result.intent,
    message:   result.outfits.length > 0
      ? `Here are ${result.outfits.length} outfits based on your wardrobe.`
      : result.message,
  }
}

// ─────────────────────────────────────────────
// Answer a general fashion question
// without generating outfit combinations
// e.g. "What is smart casual?" or "How do I care for linen?"
// ─────────────────────────────────────────────

async function handleFashionQuestion({ userId, message, sessionId }) {
  const model = getGenerativeModel()

  // Load session for conversation context
  let session = null
  if (sessionId) {
    session = await ConversationSession.findById(sessionId)
  }

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

  // Update session with this exchange
  if (session) {
    session.messages.push(
      { role: 'user',      content: message },
      { role: 'assistant', content: answer }
    )
    session.messages = session.messages.slice(-20)
    await session.save()
  } else if (sessionId) {
    // Session ID provided but not found — create new
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
// Classify whether a message is an outfit request
// or a general fashion question
// Keeps it simple — keyword based + Gemini fallback
// ─────────────────────────────────────────────

async function classifyMessage(message) {
  const outfitKeywords = [
    'wear', 'outfit', 'dress', 'suggest', 'recommend',
    'what should i', 'what to wear', 'style me', 'look',
    'going to', 'attending', 'interview', 'party', 'date',
    'casual', 'formal', 'wedding', 'office', 'gym', 'college',
    'more casual', 'something else', 'different', 'show me',
  ]

  const lower = message.toLowerCase()
  const hasKeyword = outfitKeywords.some(kw => lower.includes(kw))

  // Fast path — keyword match
  if (hasKeyword) return true

  // Short messages are likely follow-ups — treat as outfit requests
  if (message.trim().split(' ').length <= 5) return true

  // Fallback — pure questions usually start with 'what is', 'how', 'why', 'can you explain'
  const questionPatterns = [
    /^what is/i,
    /^how (do|does|can|should)/i,
    /^why (do|does|is)/i,
    /^can you explain/i,
    /^tell me about/i,
  ]

  return !questionPatterns.some(pattern => pattern.test(message.trim()))
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
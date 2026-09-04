import { getStructuredModel } from '../../config/gemini.js'

const VALID = {
  occasions: ['casual','formal','party','office','date','gym','travel','wedding','beach','college'],
  formality:  ['casual','semi-formal','formal'],
  season:     ['summer','winter','spring','autumn'],
  weather:    ['hot','cold','mild','rain'],
  style:      ['casual','formal','streetwear','minimal','sporty','ethnic','bohemian','preppy','classic'],
}

function validateIntent(raw) {
  return {
    occasions: VALID.occasions.includes(raw.occasions)
      ? raw.occasions
      : null,

    formality: VALID.formality.includes(raw.formality)
      ? raw.formality
      : null,

    season: VALID.season.includes(raw.season)
      ? raw.season
      : null,

    weatherSuitability: VALID.weather.includes(raw.weatherSuitability)
      ? raw.weatherSuitability
      : null,

    style: Array.isArray(raw.style)
      ? raw.style.filter(s => VALID.style.includes(s))
      : [],

    isRefinement:          raw.isRefinement === true,
    refinementInstruction: raw.refinementInstruction || null,
  }
}

// ─────────────────────────────────────────────
// Extract structured intent from natural language
// Conversation history allows follow-up queries to inherit context
// e.g. "make it more casual" correctly inherits previous occasion
// ─────────────────────────────────────────────

export async function extractIntent(userMessage, conversationHistory = []) {
  const model = getStructuredModel()

  // Include last 4 messages as context for follow-up detection
  const recentHistory = conversationHistory
    .slice(-4)
    .map(m => `${m.role}: ${m.content}`)
    .join('\n')

  const prompt = `
Extract outfit intent from the user's message.
${recentHistory ? `\nConversation context:\n${recentHistory}\n` : ''}
Current message: "${userMessage}"

Rules:
- If the message is a follow-up or refinement ("more casual", "something else", "what about dinner"), inherit and modify intent from conversation context.
- "isRefinement" should be true if the user is modifying a previous suggestion.
- "refinementInstruction" should capture exactly what they want changed.

Return ONLY valid JSON:
{
  "occasions": one of [casual, formal, party, office, date, gym, travel, wedding, beach, college] or null,
  "formality": one of [casual, semi-formal, formal] or null,
  "season": one of [summer, winter, spring, autumn] or null,
  "weatherSuitability": one of [hot, cold, mild, rain] or null,
  "style": array from [casual, formal, streetwear, minimal, sporty, ethnic, bohemian, preppy, classic],
  "isRefinement": boolean,
  "refinementInstruction": string or null
}

Examples:
- "what to wear for my interview tomorrow" → {"occasions":"office","formality":"formal","season":null,"weatherSuitability":null,"style":["formal","minimal"],"isRefinement":false,"refinementInstruction":null}
- "make it more casual" → {"occasions":"office","formality":"casual","season":null,"weatherSuitability":null,"style":["casual"],"isRefinement":true,"refinementInstruction":"make it more casual"}
- "beach party this weekend, really hot" → {"occasions":"beach","formality":"casual","season":"summer","weatherSuitability":"hot","style":["casual","sporty"],"isRefinement":false,"refinementInstruction":null}
  `

  try {
    const result = await model.generateContent(prompt)
    const raw    = JSON.parse(result.response.text())
    return validateIntent(raw)
  } catch {
    // Return empty intent — retrieval handles gracefully
    return {
      occasions:          null,
      formality:          null,
      season:             null,
      weatherSuitability: null,
      style:              [],
      isRefinement:       false,
      refinementInstruction: null,
    }
  }
}
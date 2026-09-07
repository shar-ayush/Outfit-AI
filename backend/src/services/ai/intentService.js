import { getStructuredModel } from '../../config/gemini.js'

const VALID = {
  occasions: ['casual','formal','party','office','date','gym','travel','wedding','beach','college'],
  formality:  ['casual','semi-formal','formal'],
  season:     ['summer','winter','spring','autumn'],
  weather:    ['hot','cold','mild','rain'],
  style:      ['casual','formal','streetwear','minimal','sporty','ethnic','bohemian','preppy','classic'],
  slots:      ['top','bottom','footwear','outerwear','accessory','full_body'],
  messageType: ['outfit_request', 'fashion_question'],
}

function validateSlotConstraint(raw) {
  if (!raw || typeof raw !== 'object') return null

  const color       = typeof raw.color === 'string' ? raw.color.toLowerCase().trim() : null
  const subCategory = typeof raw.subCategory === 'string' ? raw.subCategory.toLowerCase().trim() : null
  const pattern     = typeof raw.pattern === 'string' ? raw.pattern.toLowerCase().trim() : null

  // A slot constraint with nothing set is the same as no constraint — return null
  if (!color && !subCategory && !pattern) return null

  return { color, subCategory, pattern }
}

function validateSlotConstraints(raw) {
  if (!raw || typeof raw !== 'object') return {}

  const result = {}
  for (const slot of VALID.slots) {
    const constraint = validateSlotConstraint(raw[slot])
    if (constraint) result[slot] = constraint
  }
  return result
}

function validateExcludeConstraints(raw) {
  if (!Array.isArray(raw)) return []

  return raw
    .filter(item =>
      item &&
      VALID.slots.includes(item.slot) &&
      ['color', 'subCategory', 'pattern'].includes(item.attribute) &&
      typeof item.value === 'string' && item.value.trim().length > 0
    )
    .map(item => ({
      slot:      item.slot,
      attribute: item.attribute,
      value:     item.value.toLowerCase().trim(),
    }))
}

function validateIntent(raw) {
  return {
    messageType: VALID.messageType.includes(raw.messageType)
      ? raw.messageType
      : 'outfit_request', // default — safer to over-trigger outfit generation than under-trigger it

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

    slotConstraints:     validateSlotConstraints(raw.slotConstraints),
    resetSlots:          Array.isArray(raw.resetSlots) ? raw.resetSlots.filter(s => VALID.slots.includes(s)) : [],
    excludeConstraints:  validateExcludeConstraints(raw.excludeConstraints),
    moodDescriptor:      typeof raw.moodDescriptor === 'string' && raw.moodDescriptor.trim().length > 0
      ? raw.moodDescriptor.trim()
      : null,

    isRefinement:          raw.isRefinement === true,
    refinementInstruction: raw.refinementInstruction || null,
  }
}

// ─────────────────────────────────────────────
// Extract structured intent + route the message
// Conversation history allows follow-up queries to inherit context
// e.g. "make it more casual" correctly inherits previous occasion
// This single call now ALSO decides: is this an outfit request
// or a general fashion question? (replaces the old keyword-based
// classifyMessage() in stylistService.js)
// ─────────────────────────────────────────────

export async function extractIntent(userMessage, conversationHistory = []) {
  const model = getStructuredModel()

  const recentHistory = conversationHistory
    .slice(-4)
    .map(m => `${m.role}: ${m.content}`)
    .join('\n')

  const prompt = `
Analyze the user's message for a personal stylist chat app.

${recentHistory ? `\nConversation context:\n${recentHistory}\n` : ''}
Current message: "${userMessage}"

STEP 1 — Classify the message:
"messageType" is "outfit_request" if the user wants outfit suggestions, is describing
an occasion, mentions specific clothing items/colors, or is refining a previous
suggestion. It is "fashion_question" ONLY for general fashion knowledge questions
that do NOT require looking at the user's wardrobe (e.g. "what is smart casual?",
"how do I care for linen?", "is it okay to wear white after labor day?").
When in doubt, prefer "outfit_request".

STEP 2 — If outfit_request, extract ALL of the following:
- occasions, formality, season, weatherSuitability, style — as before
- "slotConstraints": ONLY populate a slot (top/bottom/footwear/outerwear/accessory/full_body)
  when the user EXPLICITLY named a color, garment type, or pattern for that slot.
  Do not guess or fill in slots the user didn't mention. Leave a slot entirely
  absent if nothing was said about it.
- "resetSlots": array of slot names (from [top, bottom, footwear, outerwear, accessory, full_body])
  where the user explicitly asks to CHANGE, REPLACE, or TRY SOMETHING ELSE for that slot
  (e.g. "suggest something else in top", "different top", "change shirt", "any top",
  "try another footwear", "different jacket"). This tells the system to DROP previous constraints on that slot.
- "excludeConstraints": array of { slot, attribute, value } for anything the user
  said NOT to include (e.g. "no heels" → {slot: "footwear", attribute: "subCategory", value: "heels"};
  "nothing black" → {slot: <any if unspecified>, attribute: "color", value: "black"}.
  CRITICAL: If the user says "something else in top" or "different top" after a specific top (e.g. pink) was suggested,
  also add an exclusion for that previous top color/type so the same item is not repeated!).
- "moodDescriptor": a short phrase capturing any qualitative/emotional request that
  doesn't map to a discrete field (e.g. "feel powerful", "dark academia vibe",
  "effortless but put-together"). Null if nothing like this was said.
- "isRefinement": true if this message modifies a previous suggestion rather than
  starting a new request. Only refine fields that changed — leave the rest untouched
  in your output (the app will merge this with prior context, so it's fine to only
  return what changed for isRefinement cases).
- "refinementInstruction": plain text of what changed, if isRefinement is true.

Return ONLY valid JSON matching this shape:
{
  "messageType": "outfit_request" | "fashion_question",
  "occasions": one of [casual, formal, party, office, date, gym, travel, wedding, beach, college] or null,
  "formality": one of [casual, semi-formal, formal] or null,
  "season": one of [summer, winter, spring, autumn] or null,
  "weatherSuitability": one of [hot, cold, mild, rain] or null,
  "style": array from [casual, formal, streetwear, minimal, sporty, ethnic, bohemian, preppy, classic],
  "slotConstraints": {
    "top":       { "color": string|null, "subCategory": string|null, "pattern": string|null } | null,
    "bottom":    { "color": string|null, "subCategory": string|null, "pattern": string|null } | null,
    "footwear":  { "color": string|null, "subCategory": string|null, "pattern": string|null } | null,
    "outerwear": { "color": string|null, "subCategory": string|null, "pattern": string|null } | null
  },
  "resetSlots": ["top" | "bottom" | "footwear" | "outerwear" | "accessory" | "full_body"],
  "excludeConstraints": [{ "slot": string, "attribute": "color"|"subCategory"|"pattern", "value": string }],
  "moodDescriptor": string or null,
  "isRefinement": boolean,
  "refinementInstruction": string or null
}

Examples:
- "suggest me an outfit with pink top white skirt and black footwear" →
  {"messageType":"outfit_request","occasions":"casual","formality":"casual","season":null,"weatherSuitability":null,"style":["casual"],"slotConstraints":{"top":{"color":"pink","subCategory":null,"pattern":null},"bottom":{"color":"white","subCategory":"skirt","pattern":null},"footwear":{"color":"black","subCategory":null,"pattern":null}},"resetSlots":[],"excludeConstraints":[],"moodDescriptor":null,"isRefinement":false,"refinementInstruction":null}
- "Can you suggest something else in top with white skirt or trousers" (after pink top was recommended) →
  {"messageType":"outfit_request","occasions":null,"formality":null,"season":null,"weatherSuitability":null,"style":[],"slotConstraints":{"bottom":{"color":"white","subCategory":null,"pattern":null}},"resetSlots":["top"],"excludeConstraints":[{"slot":"top","attribute":"color","value":"pink"}],"moodDescriptor":null,"isRefinement":true,"refinementInstruction":"suggest different top other than pink with white skirt or trousers"}
- "actually make the top red instead" →
  {"messageType":"outfit_request","occasions":null,"formality":null,"season":null,"weatherSuitability":null,"style":[],"slotConstraints":{"top":{"color":"red","subCategory":null,"pattern":null}},"resetSlots":[],"excludeConstraints":[],"moodDescriptor":null,"isRefinement":true,"refinementInstruction":"change top color to red"}
- "I want to feel powerful for my presentation, no heels though" →
  {"messageType":"outfit_request","occasions":"office","formality":"formal","season":null,"weatherSuitability":null,"style":["formal"],"slotConstraints":{},"resetSlots":[],"excludeConstraints":[{"slot":"footwear","attribute":"subCategory","value":"heels"}],"moodDescriptor":"powerful and confident","isRefinement":false,"refinementInstruction":null}
- "what is smart casual?" →
  {"messageType":"fashion_question","occasions":null,"formality":null,"season":null,"weatherSuitability":null,"style":[],"slotConstraints":{},"resetSlots":[],"excludeConstraints":[],"moodDescriptor":null,"isRefinement":false,"refinementInstruction":null}
  `

  try {
    const result = await model.generateContent(prompt)
    const raw    = JSON.parse(result.response.text())
    return validateIntent(raw)
  } catch {
    // Safe fallback — default to outfit_request so the pipeline still
    // attempts a recommendation rather than silently doing nothing
    return {
      messageType:        'outfit_request',
      occasions:          null,
      formality:          null,
      season:             null,
      weatherSuitability: null,
      style:              [],
      slotConstraints:    {},
      excludeConstraints: [],
      moodDescriptor:     null,
      isRefinement:       false,
      refinementInstruction: null,
    }
  }
}
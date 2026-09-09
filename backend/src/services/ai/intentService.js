import { getStructuredModel } from '../../config/gemini.js'

const VALID = {
  occasions: ['casual','formal','party','office','date','gym','travel','wedding','beach','college'],
  formality:  ['casual','semi-formal','formal'],
  season:     ['summer','winter','spring','autumn'],
  weather:    ['hot','cold','mild','rain'],
  style:      ['casual','formal','streetwear','minimal','sporty','ethnic','bohemian','preppy','classic'],
  slots:      ['top','bottom','footwear','outerwear','accessory','full_body'],
  messageType: ['outfit_request', 'fashion_question', 'unrelated'],
}

function validateSlotConstraint(raw) {
  if (!raw || typeof raw !== 'object') return null

  const color       = typeof raw.color === 'string' ? raw.color.toLowerCase().trim() : null
  const subCategory = typeof raw.subCategory === 'string' ? raw.subCategory.toLowerCase().trim() : null
  const pattern     = typeof raw.pattern === 'string' ? raw.pattern.toLowerCase().trim() : null

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
      : 'outfit_request',

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
    requestedCount:      typeof raw.requestedCount === 'number' && raw.requestedCount >= 1 && raw.requestedCount <= 3 ? raw.requestedCount : 3,
    excludeConstraints:  validateExcludeConstraints(raw.excludeConstraints),
    moodDescriptor:      typeof raw.moodDescriptor === 'string' && raw.moodDescriptor.trim().length > 0
      ? raw.moodDescriptor.trim()
      : null,

    isRefinement:          raw.isRefinement === true,
    refinementInstruction: raw.refinementInstruction || null,
  }
}

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

STEP 1 — Classify the message into "messageType":
- "outfit_request": The user wants outfit suggestions, is describing an occasion/event/weather to dress for, mentions specific clothing items/colors to wear, or is refining/swapping an item in a previous suggestion from their wardrobe.
- "fashion_question": General fashion knowledge, styling advice, dress codes, fabric care, color matching, or fashion trends that do NOT require looking at the user's wardrobe (e.g. "what is smart casual?", "how do I care for linen?", "what colors match with olive green?", "is it okay to wear white after labor day?").
- "unrelated": The message is completely unrelated to fashion, style, clothing, outfits, shoes, accessories, or wardrobe. This includes general knowledge/trivia, math, coding/programming, politics, science, recipes, sports, random chat, jokes, or queries outside the fashion domain.

When in doubt between "outfit_request" and "fashion_question", prefer "outfit_request". But if the query is clearly not about fashion, classify it as "unrelated".

STEP 2 — If outfit_request, extract ALL of the following:
- occasions, formality, season, weatherSuitability, style — as before
- "requestedCount": integer 1, 2, or 3.
  - Set 1 if user asks for "an outfit", "just 1 option", "one look", "single outfit", or when SWAPPING/CHANGING an item in the current outfit.
  - Set 2 if user asks for "2 options", "a couple of looks", "two outfits".
  - Set 3 for "3 outfits", "some outfits", "options", or when no number is specified.
- "slotConstraints": ONLY populate a slot (top/bottom/footwear/outerwear/accessory/full_body)
  when the user EXPLICITLY named a color, garment type, or pattern for that slot, OR when carrying over items in an item swap.
- "resetSlots": array of slot names (from [top, bottom, footwear, outerwear, accessory, full_body])
  where the user explicitly asks to CHANGE, REPLACE, or TRY SOMETHING ELSE for that slot
  (e.g. "suggest something else in top", "different top", "change shirt", "any top",
  "try another footwear", "different jacket").
  CRITICAL: If the user says "only [slot]" or "just [slot]" (e.g. "I want only black top", "just show me outfits with sneakers"),
  they want to ANCHOR on that slot and free up the other slots. Include all other previously constrained slots in "resetSlots" so the system can explore versatile combinations!
  DO NOT put slots into resetSlots when the user is simply swapping an item (e.g. "swap with black bottom").
- "ITEM SWAP / IN-PLACE REFINEMENT":
  When the user asks to swap, change, or replace a specific item in the previous outfit (e.g. "Can you swap with black bottom", "swap the skirt with black trousers", "change shoes to sneakers", "can we do black pants instead"):
  1. The user wants to KEEP the other items from that previous outfit (e.g. keep the same top, footwear, and outerwear) and ONLY replace the mentioned slot!
  2. Inspect the last assistant message in the Conversation context to identify what was worn. Carry forward those other items into "slotConstraints" so those items stay locked! (e.g. if the previous outfit was cardigan + sweatpants + sandals + jacket, keep top: {color: "black", subCategory: "cardigan"}, footwear: {color: "light blue", subCategory: "sandals"}, outerwear: {color: "burgundy", subCategory: "leather jacket"}).
  3. Put the new requested item into "slotConstraints" for the swapped slot (e.g. bottom: {color: "black"}).
  4. Add an exclusion in "excludeConstraints" for the item being replaced (e.g. {slot: "bottom", attribute: "color", value: "beige"}).
  5. Leave "resetSlots" as [] (do NOT put the other slots in resetSlots!).
  6. Set "requestedCount" to 1 (the user is tweaking a single outfit).
- "excludeConstraints": array of { slot, attribute, value } for anything the user
  said NOT to include (e.g. "no heels" → {slot: "footwear", attribute: "subCategory", value: "heels"};
  "nothing black" → {slot: <any if unspecified>, attribute: "color", value: "black"}.
  If the user says "something else in top" or "different top" after a specific top (e.g. pink) was suggested,
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
  "messageType": "outfit_request" | "fashion_question" | "unrelated",
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
  "requestedCount": 1 | 2 | 3,
  "excludeConstraints": [{ "slot": string, "attribute": "color"|"subCategory"|"pattern", "value": string }],
  "moodDescriptor": string or null,
  "isRefinement": boolean,
  "refinementInstruction": string or null
}

Examples:
- "suggest me an outfit with pink top white skirt and black footwear" →
  {"messageType":"outfit_request","occasions":"casual","formality":"casual","season":null,"weatherSuitability":null,"style":["casual"],"slotConstraints":{"top":{"color":"pink","subCategory":null,"pattern":null},"bottom":{"color":"white","subCategory":"skirt","pattern":null},"footwear":{"color":"black","subCategory":null,"pattern":null}},"resetSlots":[],"requestedCount":3,"excludeConstraints":[],"moodDescriptor":null,"isRefinement":false,"refinementInstruction":null}
- "Can you swap with black bottom" (after assistant: Outfit 1: black layered cardigan and shirt, beige sweatpants, light blue sandals, burgundy leather jacket) →
  {"messageType":"outfit_request","occasions":"casual","formality":"casual","season":"autumn","weatherSuitability":"rain","style":["casual"],"slotConstraints":{"top":{"color":"black","subCategory":"cardigan","pattern":null},"bottom":{"color":"black","subCategory":null,"pattern":null},"footwear":{"color":"light blue","subCategory":"sandals","pattern":null},"outerwear":{"color":"burgundy","subCategory":"leather jacket","pattern":null}},"resetSlots":[],"requestedCount":1,"excludeConstraints":[{"slot":"bottom","attribute":"color","value":"beige"}],"moodDescriptor":null,"isRefinement":true,"refinementInstruction":"swap beige bottom with black bottom while keeping cardigan, sandals, and jacket"}
- "I want only black top" (after pink top + black trousers + sandals) →
  {"messageType":"outfit_request","occasions":"casual","formality":"casual","season":null,"weatherSuitability":null,"style":[],"slotConstraints":{"top":{"color":"black","subCategory":null,"pattern":null}},"resetSlots":["bottom","footwear"],"requestedCount":3,"excludeConstraints":[{"slot":"top","attribute":"color","value":"pink"}],"moodDescriptor":null,"isRefinement":true,"refinementInstruction":"anchor on black top, explore different bottoms and shoes"}
- "Can you suggest something else in top with white skirt or trousers" (after pink top was recommended) →
  {"messageType":"outfit_request","occasions":null,"formality":null,"season":null,"weatherSuitability":null,"style":[],"slotConstraints":{"bottom":{"color":"white","subCategory":null,"pattern":null}},"resetSlots":["top"],"requestedCount":3,"excludeConstraints":[{"slot":"top","attribute":"color","value":"pink"}],"moodDescriptor":null,"isRefinement":true,"refinementInstruction":"suggest different top other than pink with white skirt or trousers"}
- "Give me just 1 quick casual look for a date" →
  {"messageType":"outfit_request","occasions":"date","formality":"casual","season":null,"weatherSuitability":null,"style":[],"slotConstraints":{},"resetSlots":[],"requestedCount":1,"excludeConstraints":[],"moodDescriptor":null,"isRefinement":false,"refinementInstruction":null}
- "what is smart casual?" →
  {"messageType":"fashion_question","occasions":null,"formality":null,"season":null,"weatherSuitability":null,"style":[],"slotConstraints":{},"resetSlots":[],"requestedCount":3,"excludeConstraints":[],"moodDescriptor":null,"isRefinement":false,"refinementInstruction":null}
- "write python code for quicksort" →
  {"messageType":"unrelated","occasions":null,"formality":null,"season":null,"weatherSuitability":null,"style":[],"slotConstraints":{},"resetSlots":[],"requestedCount":3,"excludeConstraints":[],"moodDescriptor":null,"isRefinement":false,"refinementInstruction":null}
- "who won the 2022 world cup?" →
  {"messageType":"unrelated","occasions":null,"formality":null,"season":null,"weatherSuitability":null,"style":[],"slotConstraints":{},"resetSlots":[],"requestedCount":3,"excludeConstraints":[],"moodDescriptor":null,"isRefinement":false,"refinementInstruction":null}
- "tell me a joke" →
  {"messageType":"unrelated","occasions":null,"formality":null,"season":null,"weatherSuitability":null,"style":[],"slotConstraints":{},"resetSlots":[],"requestedCount":3,"excludeConstraints":[],"moodDescriptor":null,"isRefinement":false,"refinementInstruction":null}
  `

  try {
    const result = await model.generateContent(prompt)
    const raw    = JSON.parse(result.response.text())
    return validateIntent(raw)
  } catch {
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
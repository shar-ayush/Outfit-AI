import Cloth from '../../models/Cloth.js'
import mongoose from 'mongoose'
import getGenAI from '../../config/gemini.js'
import { searchWardrobe, searchWardrobeDeclaration } from './wardrobeSearchTool.js'
import { vectorSearchWardrobe, groupByCategory } from '../ai/embeddingService.js'

const FETCH_LIMIT = 15
const MAX_TOTAL_TOOL_CALLS = 10   // hard ceiling across the whole loop
const MAX_CALLS_PER_CATEGORY = 3   // matches searchWardrobeDeclaration's stated limit
const REQUIRED_SLOTS = ['top', 'bottom', 'footwear']

// ─────────────────────────────────────────────
// Strip items down to what the LLM needs to see to decide
// whether a slot needs relaxing. Full item objects are kept
// separately for actual candidate generation — this summary
// only goes back to Gemini as the functionResponse payload.
// ─────────────────────────────────────────────

function summarizeForLLM(items, limit = 8) {
  return items
    .slice()
    .sort((a, b) => (b.vectorScore ?? 0) - (a.vectorScore ?? 0))
    .slice(0, limit)
    .map(item => ({
      id: item._id.toString(),
      color: item.color?.primary,
      subCategory: item.subCategory,
      pattern: item.pattern,
      style: item.style,
      formality: item.formality,
      vectorScore: item.vectorScore != null ? Number(item.vectorScore.toFixed(3)) : null,
    }))
}

function buildRetrievalPrompt(userQuery, intent) {
  return `
You are retrieving candidate wardrobe items for an outfit recommendation.
Use the searchWardrobe tool to fetch items — do not guess or invent items yourself.

Call it once per category needed:
- Always try: top, bottom, footwear — UNLESS the request implies a one-piece garment
  (dress, jumpsuit), in which case use full_body + footwear instead of top+bottom.
- Call outerwear only if weather/season/the user's own words suggest a layer is needed.
- If a category call returns fewer than 2 usable items, you may call that SAME
  category again with colorFamily instead of an exact color, or a lower
  minSimilarity — but no more than twice per category, and note when you do this.

User's request details:
- Occasion: ${intent.occasions || 'not specified'}
- Formality: ${intent.formality || 'not specified'}
- Season: ${intent.season || 'not specified'}
- Weather: ${intent.weatherSuitability || 'not specified'}
- Style: ${(intent.style || []).join(', ') || 'not specified'}
- Mood/vibe: ${intent.moodDescriptor || 'none'}
- Slot constraints: ${JSON.stringify(intent.slotConstraints || {})}
- Exclusions: ${JSON.stringify(intent.excludeConstraints || [])}
- Original message: "${userQuery}"

For each call, set queryText to a natural phrase combining that slot's constraint
(if any) with the occasion/mood — e.g. "pink top for a confident office look".
Set color/subCategory directly from slotConstraints when present for that slot.
Set excludeSubCategories from any excludeConstraints that apply to that slot.

Once you've called searchWardrobe for every category you believe is needed, stop —
you do not need to write a summary or explanation.
  `.trim()
}

// ─────────────────────────────────────────────
// Agentic retrieval — the LLM decides which categories to
// search, with what constraints, and whether to relax them.
// Falls back to fixed parallel retrieval on hard failure.
// ─────────────────────────────────────────────

async function agenticRetrieval(userId, userQuery, intent) {
  const model = getGenAI().getGenerativeModel({
    model: 'gemini-3.5-flash-lite',
    tools: [{ functionDeclarations: [searchWardrobeDeclaration] }],
  })

  const chat = model.startChat()
  const collected = {}       // category -> Map<itemId, fullItem>
  const trail = []       // debug/audit trail — every tool call made
  const callCountByCategory = {}
  let totalCalls = 0

  let response = (await chat.sendMessage(buildRetrievalPrompt(userQuery, intent))).response
  let calls = response.functionCalls() || []

  while (calls.length > 0 && totalCalls < MAX_TOTAL_TOOL_CALLS) {
    const functionResponseParts = []

    for (const call of calls) {
      if (call.name !== 'searchWardrobe') continue

      totalCalls++
      const args = call.args || {}
      const category = args.category

      callCountByCategory[category] = (callCountByCategory[category] || 0) + 1

      let toolResult
      if (callCountByCategory[category] > MAX_CALLS_PER_CATEGORY) {
        toolResult = { items: [], count: 0, usedFallback: false, capped: true }
      } else {
        try {
          toolResult = await searchWardrobe(userId, args)
        } catch (error) {
          toolResult = { items: [], count: 0, usedFallback: false, error: error.message }
        }
      }

      trail.push({
        callNumber: totalCalls,
        category,
        args,
        resultCount: toolResult.count,
        usedFallback: !!toolResult.usedFallback,
        capped: !!toolResult.capped,
        error: toolResult.error || null,
      })

      if (toolResult.items?.length) {
        if (!collected[category]) collected[category] = new Map()
        for (const item of toolResult.items) {
          collected[category].set(item._id.toString(), item)
        }
      }

      functionResponseParts.push({
        functionResponse: {
          name: 'searchWardrobe',
          response: {
            count: toolResult.count,
            items: summarizeForLLM(toolResult.items || []),
            note: toolResult.capped ? 'Max retries reached for this category — stop retrying it.' : undefined,
          },
        },
      })
    }

    if (totalCalls >= MAX_TOTAL_TOOL_CALLS) break

    response = (await chat.sendMessage({
      role: 'user',
      parts: functionResponseParts,
    })).response
    calls = response.functionCalls() || []
  }

  // ── Defensive floor ──
  // The LLM might skip a required slot entirely, or decide not to call
  // any tool at all. Guarantee at least one attempt per required slot
  // so candidate generation downstream always has something to work with.
  for (const slot of REQUIRED_SLOTS) {
    if (!collected[slot] || collected[slot].size === 0) {
      const fallbackArgs = {
        category: slot,
        queryText: [intent.slotConstraints?.[slot]?.color, slot, intent.occasions]
          .filter(Boolean).join(' ') || slot,
        ...(intent.slotConstraints?.[slot] || {}),
      }
      const result = await searchWardrobe(userId, fallbackArgs)
      trail.push({
        callNumber: ++totalCalls,
        category: slot,
        args: fallbackArgs,
        resultCount: result.count,
        usedFallback: !!result.usedFallback,
        forcedFloor: true,
      })
      if (result.items?.length) {
        collected[slot] = new Map(result.items.map(i => [i._id.toString(), i]))
      }
    }
  }

  const toArray = (cat) => collected[cat] ? Array.from(collected[cat].values()) : []

  const pool = {
    top: toArray('top'),
    bottom: toArray('bottom'),
    footwear: toArray('footwear'),
    outerwear: toArray('outerwear'),
    full_body: toArray('full_body'),
    accessory: toArray('accessory'),
  }

  const isEmpty = (
    (!pool.top.length || !pool.bottom.length || !pool.footwear.length) &&
    (!pool.full_body.length || !pool.footwear.length)
  )

  const wasRelaxed = trail.some(t =>
    t.args?.colorFamily || t.usedFallback || t.forcedFloor ||
    (t.args?.minSimilarity != null && t.args.minSimilarity < 0.5)
  )

  return {
    ...pool,
    isEmpty,
    wasRelaxed,
    retrievalTrail: trail,
    agenticLoopUsed: true,
  }
}

// ─────────────────────────────────────────────
// Fallback path — the OLD fixed parallel retrieval,
// kept verbatim in behavior. Used only if the agentic
// loop throws (API error, safety block, SDK failure).
// ─────────────────────────────────────────────

function buildFilter(userId, intent, relaxLevel = 0) {
  const uid = typeof userId === 'string'
    ? new mongoose.Types.ObjectId(userId)
    : userId

  const filter = {
    userId: uid,
    aiTagged: true,
    isAvailable: true,
    isArchived: false,
  }

  if (relaxLevel < 3 && intent.formality) {
    filter.formality = intent.formality === 'formal'
      ? { $in: ['formal', 'semi-formal'] }
      : intent.formality === 'casual'
        ? { $in: ['casual', 'semi-formal'] }
        : intent.formality
  }
  if (relaxLevel < 2 && intent.occasions) {
    filter.occasions = { $in: [intent.occasions] }
  }
  if (relaxLevel < 1) {
    if (intent.season) filter.season = { $in: [intent.season] }
    if (intent.weatherSuitability) filter.weatherSuitability = { $in: [intent.weatherSuitability] }
  }

  return filter
}

async function fixedFilterRetrieval(userId, intent) {
  const projection = { embedding: 0 }

  for (let relaxLevel = 0; relaxLevel <= 3; relaxLevel++) {
    const filter = buildFilter(userId, intent, relaxLevel)

    const [top, bottom, footwear, outerwear, fullBody] = await Promise.all([
      Cloth.find({ ...filter, category: 'top' }).select(projection).limit(FETCH_LIMIT),
      Cloth.find({ ...filter, category: 'bottom' }).select(projection).limit(FETCH_LIMIT),
      Cloth.find({ ...filter, category: 'footwear' }).select(projection).limit(10),
      Cloth.find({ ...filter, category: 'outerwear' }).select(projection).limit(6),
      Cloth.find({ ...filter, category: 'full_body' }).select(projection).limit(8),
    ])

    const hasMinimum = top.length > 0 && bottom.length > 0 && footwear.length > 0
    const hasFullBodyAlternative = fullBody.length > 0 && footwear.length > 0

    if (hasMinimum || hasFullBodyAlternative) {
      return { top, bottom, footwear, outerwear, full_body: fullBody, relaxLevel }
    }
  }

  return { top: [], bottom: [], footwear: [], outerwear: [], full_body: [], relaxLevel: 4 }
}

async function fallbackRetrieval(userId, userQuery, intent) {
  const [filterResults, ragItems] = await Promise.all([
    fixedFilterRetrieval(userId, intent),
    vectorSearchWardrobe(userId, userQuery, { limit: 20 }),
  ])

  const ragByCategory = groupByCategory(ragItems)
  const categories = ['top', 'bottom', 'footwear', 'outerwear', 'full_body', 'accessory']
  const merged = {}

  for (const cat of categories) {
    const filterItems = filterResults[cat] || []
    const ragCatItems = ragByCategory[cat] || []
    const existingIds = new Set(filterItems.map(i => i._id.toString()))
    const uniqueRag = ragCatItems.filter(i => !existingIds.has(i._id.toString()))
    merged[cat] = [...filterItems, ...uniqueRag]
  }

  const isEmpty = (
    (!merged.top?.length || !merged.bottom?.length || !merged.footwear?.length) &&
    (!merged.full_body?.length || !merged.footwear?.length)
  )

  return {
    ...merged,
    isEmpty,
    wasRelaxed: filterResults.relaxLevel > 0,
    relaxLevel: filterResults.relaxLevel,
    retrievalTrail: [],
    agenticLoopUsed: false,
  }
}

// ─────────────────────────────────────────────
// Public entry point — unchanged signature, so
// outfitService.js needs no changes for this step.
// ─────────────────────────────────────────────

export async function hybridRetrieval(userId, userQuery, intent) {
  try {
    return await agenticRetrieval(userId, userQuery, intent)
  } catch (error) {
    console.error('Agentic retrieval failed, falling back to fixed filter retrieval:', error.message)
    return await fallbackRetrieval(userId, userQuery, intent)
  }
}
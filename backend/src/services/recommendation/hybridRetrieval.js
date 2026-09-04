import Cloth from '../../models/Cloth.js'
import { vectorSearchWardrobe, groupByCategory } from '../ai/embeddingService.js'
import mongoose from 'mongoose'

const FETCH_LIMIT = 15

// ─────────────────────────────────────────────
// Build MongoDB filter from extracted intent
// relaxLevel controls how strictly filters are applied
// 0 = all filters, 3 = no filters (guaranteed results)
// ─────────────────────────────────────────────

function buildFilter(userId, intent, relaxLevel = 0) {
  const uid = typeof userId === 'string'
    ? new mongoose.Types.ObjectId(userId)
    : userId

  const filter = {
    userId:      uid,
    aiTagged:    true,
    isAvailable: true,
    isArchived:  false,
  }

  // Formality — always kept unless fully relaxed
  if (relaxLevel < 3 && intent.formality) {
    filter.formality = intent.formality === 'formal'
      ? { $in: ['formal', 'semi-formal'] }
      : intent.formality === 'casual'
        ? { $in: ['casual', 'semi-formal'] }
        : intent.formality
  }

  // Occasion — dropped at level 2
  if (relaxLevel < 2 && intent.occasions) {
    filter.occasions = { $in: [intent.occasions] }
  }

  // Season + weather — dropped at level 1
  if (relaxLevel < 1) {
    if (intent.season)             filter.season             = { $in: [intent.season] }
    if (intent.weatherSuitability) filter.weatherSuitability = { $in: [intent.weatherSuitability] }
  }

  return filter
}

// ─────────────────────────────────────────────
// Structured filter retrieval with gradual relaxation
// ─────────────────────────────────────────────

async function structuredRetrieval(userId, intent) {
  const projection = {
    embedding: 0, // exclude vector from results
  }

  for (let relaxLevel = 0; relaxLevel <= 3; relaxLevel++) {
    const filter = buildFilter(userId, intent, relaxLevel)

    const [top, bottom, footwear, outerwear, fullBody] = await Promise.all([
      Cloth.find({ ...filter, category: 'top' })
           .select(projection).limit(FETCH_LIMIT),
      Cloth.find({ ...filter, category: 'bottom' })
           .select(projection).limit(FETCH_LIMIT),
      Cloth.find({ ...filter, category: 'footwear' })
           .select(projection).limit(10),
      Cloth.find({ ...filter, category: 'outerwear' })
           .select(projection).limit(6),
      Cloth.find({ ...filter, category: 'full_body' })
           .select(projection).limit(8),
    ])

    const hasMinimum = top.length > 0 && bottom.length > 0 && footwear.length > 0
    const hasFullBodyAlternative = fullBody.length > 0 && footwear.length > 0

    if (hasMinimum || hasFullBodyAlternative) {
      return { top, bottom, footwear, outerwear, full_body: fullBody, relaxLevel }
    }

    console.log(`Filter relaxLevel ${relaxLevel} insufficient, trying ${relaxLevel + 1}`)
  }

  return { top: [], bottom: [], footwear: [], outerwear: [], full_body: [], relaxLevel: 4 }
}

// ─────────────────────────────────────────────
// Merge filter results and RAG results
// Filter results are the base — RAG adds what filters missed
// ─────────────────────────────────────────────

function mergePools(filterResults, ragByCategory) {
  const categories = ['top', 'bottom', 'footwear', 'outerwear', 'full_body', 'accessory']
  const merged     = {}
  let filterHits   = 0
  let ragHits      = 0

  for (const cat of categories) {
    const filterItems = filterResults[cat] || []
    const ragItems    = ragByCategory[cat] || []

    filterHits += filterItems.length

    // Add RAG items not already present from filter
    const existingIds   = new Set(filterItems.map(i => i._id.toString()))
    const uniqueRagItems = ragItems.filter(i => !existingIds.has(i._id.toString()))
    ragHits += uniqueRagItems.length

    merged[cat] = [...filterItems, ...uniqueRagItems]
  }

  const isEmpty = (
    (!merged.top?.length || !merged.bottom?.length || !merged.footwear?.length) &&
    (!merged.full_body?.length || !merged.footwear?.length)
  )

  return { ...merged, filterHits, ragHits, isEmpty }
}

// ─────────────────────────────────────────────
// Main hybrid retrieval function
// Runs both paths in parallel — always
// ─────────────────────────────────────────────

export async function hybridRetrieval(userId, userQuery, intent) {
  const [filterResults, ragItems] = await Promise.all([
    structuredRetrieval(userId, intent),
    vectorSearchWardrobe(userId, userQuery, { limit: 20 }),
  ])

  const ragByCategory = groupByCategory(ragItems)
  const merged        = mergePools(filterResults, ragByCategory)

  return {
    ...merged,
    relaxLevel: filterResults.relaxLevel,
    wasRelaxed: filterResults.relaxLevel > 0,
  }
}
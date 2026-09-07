import Cloth from '../../models/Cloth.js'
import { generateEmbedding } from '../ai/embeddingService.js'
import mongoose from 'mongoose'

const DEFAULT_LIMIT = 10

// ─────────────────────────────────────────────
// Gemini function-calling declaration.
// This is the schema the LLM sees — it decides when and
// how to call searchWardrobe based on this description.
// Wired into the actual chat loop in Step 3.
// ─────────────────────────────────────────────

export const searchWardrobeDeclaration = {
  name: 'searchWardrobe',
  description:
    'Search the user\'s wardrobe for clothing items in a specific category, ' +
    'optionally constrained by color, garment subtype, or pattern. Uses semantic ' +
    'similarity ranking combined with metadata filters. Call this once per outfit ' +
    'slot you need (top, bottom, footwear, outerwear, etc). If a call returns fewer ' +
    'than 2 usable items, you may call it again for the same slot with relaxed ' +
    'constraints — e.g. colorFamily instead of an exact color, or a lower ' +
    'minSimilarity — but note in your final answer that you did this.',
  parameters: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        enum: ['top', 'bottom', 'footwear', 'outerwear', 'accessory', 'full_body'],
        description: 'The clothing category/slot to search for.',
      },
      color: {
        type: 'string',
        description: 'Exact primary color requested by the user, e.g. "pink", "white", "black". Omit entirely if the user did not specify a color for this slot.',
      },
      colorFamily: {
        type: 'string',
        description: 'Broader color family — use this INSTEAD of color when relaxing a failed exact-color search. One of: neutral, blue, red, green, earth, pastel.',
      },
      subCategory: {
        type: 'string',
        description: 'Specific garment type requested, e.g. "skirt", "trousers", "sneakers", "blazer". Omit if not specified.',
      },
      excludeSubCategories: {
        type: 'array',
        items: { type: 'string' },
        description: 'Garment subtypes to exclude from results, e.g. ["heels"] if the user said "no heels".',
      },
      queryText: {
        type: 'string',
        description: 'Natural language description used for semantic similarity ranking, e.g. "pink top" or "powerful confident blazer for a presentation".',
      },
      minSimilarity: {
        type: 'number',
        description: 'Minimum semantic similarity score, 0 to 1. Defaults to 0.5. Lower this on a retry if the first call returned too few results.',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of items to return. Defaults to 10.',
      },
    },
    required: ['category', 'queryText'],
  },
}

// ─────────────────────────────────────────────
// Core implementation — plain async function, callable
// directly (for testing) or via the agentic loop (Step 3).
//
// Combines Atlas $vectorSearch similarity ranking with
// metadata pre-filters. Unlike the old vectorSearchWardrobe,
// vectorScore is preserved on every returned item rather
// than being dropped after retrieval.
// ─────────────────────────────────────────────

export async function searchWardrobe(userId, args = {}) {
  const {
    category,
    color                = null,
    colorFamily          = null,
    subCategory          = null,
    excludeSubCategories = [],
    queryText,
    minSimilarity        = 0.5,
    limit                = DEFAULT_LIMIT,
  } = args

  if (!category) {
    throw new Error('searchWardrobe requires a category')
  }

  const uid = typeof userId === 'string'
    ? new mongoose.Types.ObjectId(userId)
    : userId

  // Build the Atlas $vectorSearch pre-filter.
  // Same technique your existing vectorSearchWardrobe already uses
  // for isAvailable/isArchived — just parameterized further.
  const filter = {
    userId:      { $eq: uid },
    isAvailable: { $eq: true },
    isArchived:  { $eq: false },
    category:    { $eq: category },
  }

  if (color)       filter['color.primary']    = { $eq: color.toLowerCase().trim() }
  if (colorFamily) filter['color.colorFamily'] = { $eq: colorFamily.toLowerCase().trim() }

  if (subCategory || excludeSubCategories.length > 0) {
    filter.subCategory = {}
    if (subCategory) {
      filter.subCategory.$eq = subCategory.toLowerCase().trim()
    }
    if (excludeSubCategories.length > 0) {
      filter.subCategory.$nin = excludeSubCategories.map(s => s.toLowerCase().trim())
    }
  }

  const effectiveQueryText =
    queryText || [color, subCategory, category].filter(Boolean).join(' ')

  try {
    const queryEmbedding = await generateEmbedding(effectiveQueryText)

    const pipeline = [
      {
        $vectorSearch: {
          index:         'cloth_vector_index',
          path:          'embedding',
          queryVector:   queryEmbedding,
          numCandidates: limit * 10,
          limit:         limit * 2, // over-fetch, then trim after the similarity cutoff below
          filter,
        },
      },
      { $addFields: { vectorScore: { $meta: 'vectorSearchScore' } } },
      { $match: { vectorScore: { $gte: minSimilarity } } },
      { $limit: limit },
      { $project: { embedding: 0 } },
    ]

    const results = await Cloth.aggregate(pipeline)

    return {
      items: results,
      count: results.length,
      appliedFilters: { category, color, colorFamily, subCategory, excludeSubCategories, minSimilarity },
      usedFallback: false,
    }
  } catch (error) {
    // Vector index might be missing/misconfigured — degrade to
    // metadata-only filtering rather than failing the whole request.
    // Every item still returned, just without a similarity score.
    console.error('searchWardrobe: vector search failed, falling back to metadata filter:', error.message)

    const mongoFilter = {
      userId: uid,
      category,
      isAvailable: true,
      isArchived:  false,
    }
    if (color)       mongoFilter['color.primary']    = color.toLowerCase().trim()
    if (colorFamily) mongoFilter['color.colorFamily'] = colorFamily.toLowerCase().trim()
    if (subCategory || excludeSubCategories.length > 0) {
      mongoFilter.subCategory = {}
      if (subCategory) mongoFilter.subCategory.$eq = subCategory.toLowerCase().trim()
      if (excludeSubCategories.length > 0) {
        mongoFilter.subCategory.$nin = excludeSubCategories.map(s => s.toLowerCase().trim())
      }
    }

    const fallbackResults = await Cloth.find(mongoFilter)
      .select('-embedding')
      .limit(limit)
      .lean()

    return {
      items: fallbackResults.map(item => ({ ...item, vectorScore: null })),
      count: fallbackResults.length,
      appliedFilters: { category, color, colorFamily, subCategory, excludeSubCategories, minSimilarity },
      usedFallback: true,
    }
  }
}
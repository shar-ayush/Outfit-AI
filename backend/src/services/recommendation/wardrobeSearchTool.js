import Cloth from '../../models/Cloth.js'
import { generateEmbedding } from '../ai/embeddingService.js'
import mongoose from 'mongoose'
import { SchemaType } from '@google/generative-ai'
const DEFAULT_LIMIT = 10

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
    type: SchemaType.OBJECT,
    properties: {
      category: {
        type: SchemaType.STRING,
        enum: ['top', 'bottom', 'footwear', 'outerwear', 'accessory', 'full_body'],
        description: 'The clothing category/slot to search for.',
      },
      color: {
        type: SchemaType.STRING,
        description: 'Exact primary color requested by the user, e.g. "pink", "white", "black". Omit entirely if the user did not specify a color for this slot.',
      },
      colorFamily: {
        type: SchemaType.STRING,
        description: 'Broader color family — use this INSTEAD of color when relaxing a failed exact-color search. One of: neutral, blue, red, green, earth, pastel.',
      },
      subCategory: {
        type: SchemaType.STRING,
        description: 'Specific garment type requested, e.g. "skirt", "trousers", "sneakers", "blazer". Omit if not specified.',
      },
      excludeSubCategories: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: 'Garment subtypes to exclude from results, e.g. ["heels"] if the user said "no heels".',
      },
      queryText: {
        type: SchemaType.STRING,
        description: 'Natural language description used for semantic similarity ranking, e.g. "pink top" or "powerful confident blazer for a presentation".',
      },
      minSimilarity: {
        type: SchemaType.NUMBER,
        description: 'Minimum semantic similarity score, 0 to 1. Defaults to 0.5. Lower this on a retry if the first call returned too few results.',
      },
      limit: {
        type: SchemaType.NUMBER,
        description: 'Maximum number of items to return. Defaults to 10.',
      },
    },
    required: ['category', 'queryText'],
  },
}

const KNOWN_SUBCATEGORY_MAP = {
  skirt: ['skirt', 'midi skirt', 'mini skirt', 'maxi skirt', 'pleated skirt', 'pencil skirt', 'a-line skirt', 'denim skirt'],
  shirt: ['shirt', 'button-up shirt', 't-shirt', 'button-down shirt', 'polo shirt', 'dress shirt', 'layered cardigan and shirt', 'layered sweater and shirt'],
  trousers: ['trousers', 'pants', 'chinos', 'dress trousers'],
  pants: ['pants', 'trousers', 'chinos', 'cargo pants', 'sweatpants', 'jeans'],
  jeans: ['jeans', 'denim pants'],
  jacket: ['jacket', 'leather jacket', 'denim jacket', 'bomber jacket', 'blazer'],
  shoes: ['shoes', 'sneakers', 'sandals', 'heels', 'boots', 'loafers'],
  footwear: ['footwear', 'shoes', 'sneakers', 'sandals', 'heels', 'boots'],
  sweater: ['sweater', 'cardigan', 'layered sweater and shirt', 'pullover', 'hoodie'],
}

async function getMatchingSubCategories(category, subCategory) {
  if (!subCategory) return []
  const clean = subCategory.toLowerCase().trim()
  const matches = new Set([clean])

  if (KNOWN_SUBCATEGORY_MAP[clean]) {
    for (const syn of KNOWN_SUBCATEGORY_MAP[clean]) {
      matches.add(syn)
    }
  }

  try {
    const dbSubs = await Cloth.distinct('subCategory', { category })
    for (const s of dbSubs) {
      if (!s) continue
      const sLow = s.toLowerCase().trim()
      if (sLow === clean || sLow.includes(clean) || clean.includes(sLow)) {
        matches.add(sLow)
      }
    }
  } catch {
  }

  return Array.from(matches)
}

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

  const filter = {
    userId:      { $eq: uid },
    isAvailable: { $eq: true },
    isArchived:  { $eq: false },
    category:    { $eq: category },
  }

  if (color) {
    const c = color.toLowerCase().trim()
    filter.$or = [
      { 'color.primary':     { $eq: c } },
      { 'color.colorFamily': { $eq: c } },
    ]
  } else if (colorFamily) {
    filter['color.colorFamily'] = { $eq: colorFamily.toLowerCase().trim() }
  }

  if (subCategory || excludeSubCategories.length > 0) {
    filter.subCategory = {}
    if (subCategory) {
      const matchingSubs = await getMatchingSubCategories(category, subCategory)
      if (matchingSubs.length === 1) {
        filter.subCategory.$eq = matchingSubs[0]
      } else if (matchingSubs.length > 1) {
        filter.subCategory.$in = matchingSubs
      }
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
          limit:         limit * 2,
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
    console.error('searchWardrobe: vector search failed, falling back to metadata filter:', error.message)

    const mongoFilter = {
      userId: uid,
      category,
      isAvailable: true,
      isArchived:  false,
    }
    if (color) {
      const c = color.toLowerCase().trim()
      mongoFilter.$or = [
        { 'color.primary':     { $regex: c, $options: 'i' } },
        { 'color.colorFamily': c },
      ]
    } else if (colorFamily) {
      mongoFilter['color.colorFamily'] = colorFamily.toLowerCase().trim()
    }
    if (subCategory || excludeSubCategories.length > 0) {
      mongoFilter.subCategory = {}
      if (subCategory) {
        const matchingSubs = await getMatchingSubCategories(category, subCategory)
        mongoFilter.subCategory.$in = matchingSubs
      }
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
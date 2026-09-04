import { getEmbeddingModel } from '../../config/gemini.js'
import Cloth from '../../models/Cloth.js'
import ApiError from '../../utils/ApiError.js'

// ─────────────────────────────────────────────
// Generate embedding for a text string
// ─────────────────────────────────────────────

export async function generateEmbedding(text) {
  const model  = getEmbeddingModel()
  const result = await model.embedContent(text)
  return result.embedding.values // array of 768 floats
}

// ─────────────────────────────────────────────
// Generate and store embedding for a clothing item
// Called after metadata extraction during upload
// ─────────────────────────────────────────────

export async function generateAndStoreClothEmbedding(clothId, embeddingText) {
  try {
    const embedding = await generateEmbedding(embeddingText)

    await Cloth.findByIdAndUpdate(clothId, {
      embedding,
      embeddingText,
      embeddingUpdatedAt: new Date(),
    })

    return embedding
  } catch (error) {
    // Non-fatal — item is still usable without embedding
    // Structured filter retrieval still works
    console.error(`Embedding generation failed for cloth ${clothId}:`, error.message)
    return null
  }
}

// ─────────────────────────────────────────────
// Vector similarity search using MongoDB Atlas
// Returns wardrobe items semantically similar to query
// ─────────────────────────────────────────────

export async function vectorSearchWardrobe(userId, queryText, options = {}) {
  const {
    limit          = 20,
    minScore       = 0.6,
    categoryFilter = null,
  } = options

  try {
    const queryEmbedding = await generateEmbedding(queryText)

    const pipeline = [
      {
        $vectorSearch: {
          index:       'cloth_vector_index',
          path:        'embedding',
          queryVector: queryEmbedding,
          numCandidates: limit * 10,
          limit,
          filter: {
            userId:      { $eq: userId },
            isAvailable: { $eq: true },
            isArchived:  { $eq: false },
            ...(categoryFilter && { category: { $eq: categoryFilter } }),
          },
        },
      },
      {
        $addFields: {
          vectorScore: { $meta: 'vectorSearchScore' },
        },
      },
      {
        $match: {
          vectorScore: { $gte: minScore },
        },
      },
      {
        $project: {
          embedding: 0, // never return the vector — it's 768 numbers
        },
      },
    ]

    const results = await Cloth.aggregate(pipeline)
    return results
  } catch (error) {
    // Vector search might fail if index doesn't exist yet
    // Fall through to structured filter retrieval
    console.error('Vector search failed:', error.message)
    return []
  }
}

// ─────────────────────────────────────────────
// Group vector search results by category
// Output matches the format expected by compatibilityScorer
// ─────────────────────────────────────────────

export function groupByCategory(items) {
  return items.reduce((acc, item) => {
    const cat = item.category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})
}
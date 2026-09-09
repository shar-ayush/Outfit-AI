import { getEmbeddingModel } from '../../config/gemini.js'
import Cloth from '../../models/Cloth.js'
import ApiError from '../../utils/ApiError.js'

export async function generateEmbedding(text) {
  const model  = getEmbeddingModel()
  const result = await model.embedContent({
    content: { parts: [{ text }] },
    outputDimensionality: 768,
  })
  return result.embedding.values
}

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
    console.error(`Embedding generation failed for cloth ${clothId}:`, error.message)
    return null
  }
}

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
          embedding: 0,
        },
      },
    ]

    const results = await Cloth.aggregate(pipeline)
    return results
  } catch (error) {
    console.error('Vector search failed:', error.message)
    return []
  }
}

export function groupByCategory(items) {
  return items.reduce((acc, item) => {
    const cat = item.category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})
}
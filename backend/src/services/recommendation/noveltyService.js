import Recommendation from '../../models/Recommendation.js'
import Outfit from '../../models/Outfit.js'

const RECENCY_WINDOW_DAYS = 7
const MAX_NOVELTY_PENALTY = 0.4

export async function applyNoveltyPenalty(candidates, userId, shownItemIds = []) {
  const cutoff = new Date(Date.now() - RECENCY_WINDOW_DAYS * 24 * 60 * 60 * 1000)

  const recentRecs = await Recommendation.find({
    userId,
    createdAt: { $gte: cutoff },
  })
    .populate({ path: 'outfitId', select: 'items' })
    .lean()

  const recMap = {}

  for (const rec of recentRecs) {
    const daysAgo = (Date.now() - new Date(rec.createdAt)) / (1000 * 60 * 60 * 24)
    const recency = 1 / (daysAgo + 1)
    for (const item of rec.outfitId?.items || []) {
      const id = item.clothId?.toString()
      if (id) recMap[id] = Math.max(recMap[id] || 0, recency * 0.5)
    }
  }

  for (const id of shownItemIds) {
    recMap[id] = Math.max(recMap[id] || 0, 0.8)
  }

  const maxRecency = Math.max(...Object.values(recMap), 0.001)

  return candidates.map(candidate => {
    const ids         = candidate.items.map(i => i._id.toString())
    const avgRecency  = ids.reduce((sum, id) => sum + (recMap[id] || 0), 0) / ids.length
    const normalised  = avgRecency / maxRecency
    const multiplier  = 1 - (normalised * MAX_NOVELTY_PENALTY)

    return {
      ...candidate,
      score: {
        ...candidate.score,
        total:          Math.round(candidate.score.total * multiplier),
        noveltyPenalty: Math.round((1 - multiplier) * 100),
      },
    }
  }).sort((a, b) => b.score.total - a.score.total)
}
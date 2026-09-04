import Recommendation from '../../models/Recommendation.js'
import WearLog from '../../models/WearLog.js'

const RECENCY_WINDOW_DAYS = 14
const MAX_NOVELTY_PENALTY = 0.5 // max 50% penalty for recently seen items

// ─────────────────────────────────────────────
// Penalize candidates that contain recently
// suggested or recently worn items
// Prevents the system from showing the same
// combinations repeatedly
// ─────────────────────────────────────────────

export async function applyNoveltyPenalty(candidates, userId, shownItemIds = []) {
  const cutoff = new Date(Date.now() - RECENCY_WINDOW_DAYS * 24 * 60 * 60 * 1000)

  // Fetch recently recommended item IDs
  const recentRecs = await Recommendation.find({
    userId,
    createdAt: { $gte: cutoff },
  })
    .populate({ path: 'outfitId', select: 'items' })
    .lean()

  // Fetch recently worn item IDs
  const recentWears = await WearLog.find({
    userId,
    wornAt: { $gte: cutoff },
  })
    .select('items')
    .lean()

  // Build recency maps — more recent = higher score = bigger penalty
  const recMap = {}

  for (const rec of recentRecs) {
    const daysAgo = (Date.now() - new Date(rec.createdAt)) / (1000 * 60 * 60 * 24)
    const recency = 1 / (daysAgo + 1)
    for (const item of rec.outfitId?.items || []) {
      const id = item.clothId?.toString()
      if (id) recMap[id] = Math.max(recMap[id] || 0, recency * 0.7)
    }
  }

  for (const log of recentWears) {
    const daysAgo = (Date.now() - new Date(log.wornAt)) / (1000 * 60 * 60 * 24)
    const recency = 1 / (daysAgo + 1)
    for (const item of log.items || []) {
      const id = item.clothId?.toString()
      if (id) recMap[id] = Math.max(recMap[id] || 0, recency)
    }
  }

  // Also include items shown in current session
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
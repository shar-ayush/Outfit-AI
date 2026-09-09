import ItemPreference from '../../models/ItemPreference.js'
import PairPreference from '../../models/PairPreference.js'
import ContextPreference from '../../models/ContextPreference.js'
import { getCanonicalPairIds } from '../../utils/pairUtils.js'

const SIGNAL_WEIGHTS = {
  worn:     0.20,
  saved:    0.12,
  rejected: -0.15,
  skipped:  -0.05,
  shared:   0.25,
  rated:    0.15,
}

export function computeItemScore(signals) {
  let score = 0.5

  score += (signals.worn     || 0) * SIGNAL_WEIGHTS.worn
  score += (signals.saved    || 0) * SIGNAL_WEIGHTS.saved
  score += (signals.rejected || 0) * SIGNAL_WEIGHTS.rejected
  score += (signals.skipped  || 0) * SIGNAL_WEIGHTS.skipped
  score += (signals.shared   || 0) * SIGNAL_WEIGHTS.shared

  if (signals.rated > 0) {
    const avgRating = signals.ratingSum / signals.rated
    score += signals.rated * SIGNAL_WEIGHTS.rated * (avgRating / 5)
  }

  return Math.max(0.1, Math.min(1.0, score))
}

export function computePairAffinity(signals) {
  const positive = (signals.wornTogether || 0) * 2 + (signals.savedTogether || 0)
  const negative = (signals.rejectedTogether || 0) * 2

  if (signals.shownTogether === 0) return 0

  const rate = (positive - negative) / signals.shownTogether
  return Math.max(-1.0, Math.min(1.0, rate))
}

export function normalizeFrequencyMap(freqMap) {
  if (!freqMap) return {}

  let entries = []
  if (freqMap instanceof Map) {
    entries = Array.from(freqMap.entries())
  } else if (typeof freqMap === 'object') {
    entries = Object.entries(freqMap)
  }

  if (entries.length === 0) return {}

  const total = entries.reduce((sum, [, v]) => sum + (Number(v) || 0), 0)
  if (total === 0) return {}

  return Object.fromEntries(entries.map(([k, v]) => [k, (Number(v) || 0) / total]))
}

export async function fetchUserPreferences(userId) {
  const [itemPrefs, pairPrefs, contextPrefs] = await Promise.all([
    ItemPreference.find({ userId }).lean(),
    PairPreference.find({ userId }).lean(),
    ContextPreference.find({ userId }).lean(),
  ])

  const itemScoreMap = {}
  for (const pref of itemPrefs) {
    itemScoreMap[pref.clothId.toString()] = {
      score:      pref.score,
      confidence: pref.confidence,
      lastWornAt: pref.lastWornAt,
    }
  }

  const pairAffinityMap = {}
  for (const pref of pairPrefs) {
    const key = `${pref.itemAId}_${pref.itemBId}`
    pairAffinityMap[key] = {
      score:      pref.affinityScore,
      confidence: pref.confidence,
    }
  }

  const contextMap = {}
  for (const ctx of contextPrefs) {
    contextMap[ctx.contextKey] = {
      colorWeights:   normalizeFrequencyMap(ctx.colorFrequency),
      styleWeights:   normalizeFrequencyMap(ctx.styleFrequency),
      patternWeights: normalizeFrequencyMap(ctx.patternFrequency),
      confidence:     ctx.confidence,
    }
  }

  return { itemScoreMap, pairAffinityMap, contextMap }
}

function getPersonalizationScore(outfit, preferences, contextKey) {
  const { itemScoreMap, pairAffinityMap, contextMap } = preferences

  const itemScores = outfit.items.map(item => {
    const pref = itemScoreMap[item._id.toString()]
    return pref ? pref.score : 0.5
  })
  const avgItemScore = itemScores.reduce((s, v) => s + v, 0) / itemScores.length

  const pairScores = []
  for (let i = 0; i < outfit.items.length; i++) {
    for (let j = i + 1; j < outfit.items.length; j++) {
      const { itemAId, itemBId } = getCanonicalPairIds(
        outfit.items[i]._id.toString(),
        outfit.items[j]._id.toString()
      )
      const key  = `${itemAId}_${itemBId}`
      const pair = pairAffinityMap[key]
      if (pair && pair.confidence > 0.1) {
        pairScores.push((pair.score + 1) / 2)
      }
    }
  }
  const avgPairScore = pairScores.length > 0
    ? pairScores.reduce((s, v) => s + v, 0) / pairScores.length
    : 0.5

  let contextScore = 0.5
  const ctx = contextMap[contextKey]
  if (ctx && ctx.confidence > 0.1) {
    const colorMatches = outfit.items
      .map(item => ctx.colorWeights[item.color?.primary] || 0)
    const styleMatches = outfit.items
      .flatMap(item => (item.style || []).map(s => ctx.styleWeights[s] || 0))

    const allMatches = [...colorMatches, ...styleMatches]
    contextScore = allMatches.length > 0
      ? allMatches.reduce((s, v) => s + v, 0) / allMatches.length
      : 0.5
  }

  return avgItemScore * 0.45 + avgPairScore * 0.30 + contextScore * 0.25
}

export function applyPersonalization(candidates, preferences, intent, learningPhase = 0) {
  const contextKey = [
    intent?.occasions || 'general',
    intent?.formality || 'any',
  ].join('_')

  const personalizationWeight = [0.15, 0.30, 0.40][learningPhase] || 0.15
  const algorithmWeight       = 1 - personalizationWeight

  return candidates.map(candidate => {
    const baseScore   = candidate.score.total / 100
    const personScore = getPersonalizationScore(candidate, preferences, contextKey)

    const finalScore = (baseScore * algorithmWeight + personScore * personalizationWeight) * 100

    return {
      ...candidate,
      score: {
        ...candidate.score,
        total:           Math.round(finalScore),
        personalization: Math.round(personScore * 100),
        algorithm:       candidate.score.total,
      },
    }
  }).sort((a, b) => b.score.total - a.score.total)
}
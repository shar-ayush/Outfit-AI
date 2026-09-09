import { generateCandidates } from './compatibilityScorer.js'
import { fetchUserPreferences, applyPersonalization } from './personalizationService.js'
import { applyNoveltyPenalty } from './noveltyService.js'
import { composeOutfitsFromPool, recomposeSingleOutfit } from '../ai/geminiService.js'
import { verifyOutfitConstraints } from '../ai/verificationService.js'

function outfitKey(outfit) {
  return outfit.items.map(i => i._id.toString()).sort().join('_')
}

function dedupeExactOutfits(outfits) {
  const seen   = new Set()
  const result = []

  for (const outfit of outfits) {
    const key = outfitKey(outfit)
    if (!seen.has(key)) {
      seen.add(key)
      result.push(outfit)
    }
  }

  return result
}

export async function rankCandidates({
  candidatePool,
  userId,
  userQuery,
  intent,
  conversationHistory = [],
  shownItemIds        = [],
  learningPhase       = 0,
  count               = 3,
}) {
  const allCombinations = generateCandidates(candidatePool, intent, 500)

  if (allCombinations.length === 0) {
    return []
  }

  const preferences = await fetchUserPreferences(userId)

  const personalized = applyPersonalization(
    allCombinations,
    preferences,
    intent,
    learningPhase
  )

  const withNovelty = await applyNoveltyPenalty(personalized, userId, shownItemIds)

  const top20 = withNovelty.slice(0, 20)

    const composed = await composeOutfitsFromPool(
    top20,
    userQuery,
    conversationHistory,
    intent,
    count
  )

  const deduped = dedupeExactOutfits(composed)

  const verifications = await verifyOutfitConstraints(deduped, intent)

  const verified = await Promise.all(
    deduped.map(async (outfit, i) => {
      const verification = verifications.find(v => v.outfitIndex === i)
        || { satisfied: true, violations: [], justification: null }

      const needsRetry = verification.satisfied === false && !verification.justification
      if (!needsRetry) {
        return { ...outfit, verification }
      }

      const usedItemIds = outfit.items.map(item => item._id.toString())
      const replacement = await recomposeSingleOutfit(top20, userQuery, intent, usedItemIds)

      if (!replacement) {
        return { ...outfit, verification }
      }

      const [reVerification] = await verifyOutfitConstraints([replacement], intent)
      return {
        ...replacement,
        verification: reVerification || { satisfied: true, violations: [], justification: null },
      }
    })
  )

  return verified
}
import { generateCandidates } from './compatibilityScorer.js'
import { fetchUserPreferences, applyPersonalization } from './personalizationService.js'
import { applyNoveltyPenalty } from './noveltyService.js'
import { composeOutfitsFromPool, recomposeSingleOutfit } from '../ai/geminiService.js'
import { verifyOutfitConstraints } from '../ai/verificationService.js'

function outfitKey(outfit) {
  return outfit.items.map(i => i._id.toString()).sort().join('_')
}

// ─────────────────────────────────────────────
// Exact-duplicate guard.
//
// The old >50%-overlap selectDiverseOutfits rule is retired —
// it was the direct cause of forced constraint violations
// (see the compose prompt above for the real diversity logic
// now). This guard only catches the much narrower case of the
// LLM selecting the literal same candidate twice, which would
// show the user two identical outfit cards.
// ─────────────────────────────────────────────

function dedupeExactOutfits(outfits, allCandidates) {
  const seen   = new Set()
  const result = []

  for (const outfit of outfits) {
    const key = outfitKey(outfit)
    if (!seen.has(key)) {
      seen.add(key)
      result.push(outfit)
      continue
    }

    const replacement = allCandidates.find(c => !seen.has(outfitKey(c)))
    if (replacement) {
      seen.add(outfitKey(replacement))
      result.push({
        ...outfit,
        items:      replacement.items,
        score:      replacement.score,
        outfitName: `${outfit.outfitName} (Alt)`,
      })
    } else {
      // Nothing left to substitute — wardrobe genuinely can't
      // support more variety. Keep the duplicate rather than
      // silently returning fewer outfits than requested.
      result.push(outfit)
    }
  }

  return result
}

// ─────────────────────────────────────────────
// Full ranking pipeline
// ─────────────────────────────────────────────

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
  // Step 1 — generate all valid combinations via cartesian product
  // (now constraint-aware and pre-trimmed per slot — see compatibilityScorer.js)
  const allCombinations = generateCandidates(candidatePool, intent, 500)

  if (allCombinations.length === 0) {
    return []
  }

  // Step 2 — fetch user's learned preferences
  const preferences = await fetchUserPreferences(userId)

  // Step 3 — personalization layer (unchanged)
  const personalized = applyPersonalization(
    allCombinations,
    preferences,
    intent,
    learningPhase
  )

  // Step 4 — novelty penalty (unchanged)
  const withNovelty = await applyNoveltyPenalty(personalized, userId, shownItemIds)

  // Step 5 — composition
  // Wider pool than the old top15: the composer now handles its own
  // diversity/substitution reasoning, so it needs enough raw material
  // to find genuine alternatives for unconstrained slots rather than
  // relying on a separate post-hoc rejection pass.
  const top20 = withNovelty.slice(0, 20)

    const composed = await composeOutfitsFromPool(
    top20,
    userQuery,
    conversationHistory,
    intent,
    count
  )

  // Step 6 — exact-duplicate safety net
  const deduped = dedupeExactOutfits(composed, top20)

  // Step 7 — independent verification + single retry per outfit
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
        // Retry itself failed — keep the original outfit, but the
        // verification record honestly reflects the unresolved violation
        return { ...outfit, verification }
      }

      // Re-verify the replacement exactly once — no further retries beyond this
      const [reVerification] = await verifyOutfitConstraints([replacement], intent)
      return {
        ...replacement,
        verification: reVerification || { satisfied: true, violations: [], justification: null },
      }
    })
  )

  return verified
}
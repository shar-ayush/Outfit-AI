import { generateCandidates, selectDiverseOutfits } from './compatibilityScorer.js'
import { fetchUserPreferences, applyPersonalization } from './personalizationService.js'
import { applyNoveltyPenalty } from './noveltyService.js'
import { llmReRankOutfits } from '../ai/geminiService.js'

// ─────────────────────────────────────────────
// Full ranking pipeline
// This is the core of the recommendation engine
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
  // shuffle is built in so results vary each request
  const allCombinations = generateCandidates(candidatePool, intent?.occasions, 500)

  if (allCombinations.length === 0) {
    return []
  }

  // Step 2 — fetch user's learned preferences from DB
  const preferences = await fetchUserPreferences(userId)

  // Step 3 — apply personalization layer
  // blend ratio increases as learningPhase increases
  const personalized = applyPersonalization(
    allCombinations,
    preferences,
    intent,
    learningPhase
  )

  // Step 4 — novelty penalty
  // penalizes recently shown and recently worn items
  const withNovelty = await applyNoveltyPenalty(personalized, userId, shownItemIds)

  // Step 5 — take top 15 to LLM for nuanced re-ranking
  // algorithm does the heavy lifting, LLM does nuanced final selection
  const top15 = withNovelty.slice(0, 15)

  const llmRanked = await llmReRankOutfits(
    top15,
    userQuery,
    conversationHistory,
    intent,
    count
  )

  // Step 6 — final diversity enforcement across selected outfits
  // prevents two very similar outfits from both being returned
  return selectDiverseOutfits(llmRanked, count)
}
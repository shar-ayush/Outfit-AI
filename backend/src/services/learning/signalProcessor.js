// backend/src/services/learning/signalProcessor.js
//
// FIX (gap #3): RecommendationEvent creation previously only happened
// inline in outfitController/outfitService.recordOutfitAction. Both
// wearLogController.logWear and planController.updatePlanStatus call
// processSignal() directly and never created a RecommendationEvent or
// updated Recommendation.status — even though both accept/have a
// recommendationId available. This means most real-world "worn" signals
// (which happen via Plans or direct wear logs, not the outfit-action
// endpoint) left no event audit trail at all, breaking the "future
// collaborative filtering" capability backend-features.md describes.
//
// FIX: processSignal now optionally accepts `recommendationId` and, when
// present, creates the RecommendationEvent and updates the Recommendation
// status itself — one place, every caller benefits. The duplicate
// inline creation in outfitService.recordOutfitAction should be REMOVED
// now that this is centralized (see outfitService_FIX.js).
//
// ALSO FIXES a real bug: wearLogController.js destructures
// `recommendationId` from req.body but never forwarded it to
// processSignal() — it was silently dropped. See
// wearLogController_FIX.js for that one-line fix.

import ItemPreference from '../../models/ItemPreference.js'
import PairPreference from '../../models/PairPreference.js'
import ContextPreference from '../../models/ContextPreference.js'
import WearLog from '../../models/WearLog.js'
import Outfit from '../../models/Outfit.js'
import User from '../../models/User.js'
import Recommendation from '../../models/Recommendation.js'
import RecommendationEvent from '../../models/RecommendationEvent.js'
import { updateItemPreferences } from './itemPreferenceUpdater.js'
import { updatePairPreferences } from './pairPreferenceUpdater.js'
import { updateContextPreference } from './contextPreferenceUpdater.js'
import { computeItemScore } from '../recommendation/personalizationService.js'
import { getAllPairs } from '../../utils/pairUtils.js'

export const SIGNAL_WEIGHTS = {
  worn:     { item: 0.20, pair: 0.25, isPositive: true },
  saved:    { item: 0.12, pair: 0.15, isPositive: true },
  shared:   { item: 0.25, pair: 0.20, isPositive: true },
  rated:    { item: 0.15, pair: 0.10, isPositive: true },
  rejected: { item: -0.15, pair: -0.20, isPositive: false },
  skipped:  { item: -0.05, pair: -0.08, isPositive: false },
}

// ─────────────────────────────────────────────
// Main entry point — called on every user action.
// NEW: `recommendationId` (optional) — when provided, also logs a
// RecommendationEvent and marks the Recommendation as 'interacted'.
// This is now the ONE place that happens, called from outfit actions,
// wear logs, AND plan status updates alike.
// ─────────────────────────────────────────────

export async function processSignal({
  userId,
  outfitId,
  eventType,
  rating    = null,
  context   = {},
  recommendationId = null,
}) {
  try {
    const outfit = await Outfit.findById(outfitId).lean()
    if (!outfit) {
      console.error(`processSignal: outfit ${outfitId} not found`)
      return
    }

    const clothIds = outfit.items.map(i => i.clothId.toString())
    if (clothIds.length === 0) return

    await Promise.all([
      updateItemPreferences({ userId, clothIds, eventType, rating }),
      updatePairPreferences({ userId, clothIds, eventType }),
      updateContextPreference({ userId, clothIds, eventType, context, outfit }),
    ])

    if (eventType === 'worn') {
      await Outfit.findByIdAndUpdate(outfitId, {
        $inc: { wearCount: 1 },
        $set: { lastWornAt: new Date() },
      })
      await updateClothWearStats(clothIds)
    }

    // ── NEW: centralized RecommendationEvent logging ──────────────
    if (recommendationId) {
      await RecommendationEvent.create({
        userId,
        recommendationId,
        outfitId,
        eventType,
        value: rating,
        context: {
          occasion:    context.occasion,
          dayOfWeek:   context.dayOfWeek ?? new Date().getDay(),
          temperature: context.temperature,
          condition:   context.condition,
        },
        timestamp: new Date(),
      })

      await Recommendation.findByIdAndUpdate(recommendationId, {
        status: 'interacted',
      })
    }

    await updateLearningPhase(userId)

  } catch (error) {
    console.error('Signal processing error:', error.message)
  }
}

async function updateClothWearStats(clothIds) {
  const Cloth = (await import('../../models/Cloth.js')).default

  await Promise.all(
    clothIds.map(async (clothId) => {
      const cloth = await Cloth.findByIdAndUpdate(
        clothId,
        { $inc: { wearCount: 1 }, $set: { lastWornAt: new Date() } },
        { new: true }
      )
      if (cloth?.purchasePrice && cloth.wearCount > 0) {
        await Cloth.findByIdAndUpdate(clothId, {
          costPerWear: parseFloat((cloth.purchasePrice / cloth.wearCount).toFixed(2)),
        })
      }
    })
  )
}

async function updateLearningPhase(userId) {
  const mongoose = (await import('mongoose')).default
  const totalInteractions = await ItemPreference.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        total: {
          $sum: {
            $add: [
              '$signals.worn', '$signals.saved', '$signals.rejected',
              '$signals.skipped', '$signals.shared',
            ],
          },
        },
      },
    },
  ])

  const total = totalInteractions[0]?.total || 0
  const phase = total >= 50 ? 2 : total >= 10 ? 1 : 0
  await User.findByIdAndUpdate(userId, { learningPhase: phase })
}

export async function runDecay(userId) {
  try {
    const now            = new Date()
    const sixtyDaysAgo   = new Date(now - 60 * 24 * 60 * 60 * 1000)
    const ninetyDaysAgo  = new Date(now - 90 * 24 * 60 * 60 * 1000)
    const oneWeekAgo     = new Date(now - 7  * 24 * 60 * 60 * 1000)

    const staleItems = await ItemPreference.find({
      userId,
      $or: [
        { lastInteractedAt: { $lt: sixtyDaysAgo } },
        { lastInteractedAt: { $exists: false } },
      ],
      lastDecayAppliedAt: { $not: { $gte: oneWeekAgo } },
    })

    await Promise.all(
      staleItems.map(async (pref) => {
        const decayedScore = Math.max(0.1, pref.score * 0.95)
        await ItemPreference.findByIdAndUpdate(pref._id, {
          score: decayedScore,
          lastDecayAppliedAt: now,
        })
      })
    )

    const stalePairs = await PairPreference.find({
      userId,
      $or: [
        { lastSeenTogether: { $lt: ninetyDaysAgo } },
        { lastSeenTogether: { $exists: false } },
      ],
      lastDecayAppliedAt: { $not: { $gte: oneWeekAgo } },
    })

    await Promise.all(
      stalePairs.map(async (pair) => {
        const decayed = pair.affinityScore * 0.90
        await PairPreference.findByIdAndUpdate(pair._id, {
          affinityScore: parseFloat(decayed.toFixed(4)),
          lastDecayAppliedAt: now,
        })
      })
    )

    return {
      itemsDecayed: staleItems.length,
      pairsDecayed: stalePairs.length,
    }
  } catch (error) {
    console.error('Decay run error:', error.message)
    return { itemsDecayed: 0, pairsDecayed: 0 }
  }
}
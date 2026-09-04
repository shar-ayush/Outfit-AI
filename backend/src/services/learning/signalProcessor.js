import ItemPreference from '../../models/ItemPreference.js'
import PairPreference from '../../models/PairPreference.js'
import ContextPreference from '../../models/ContextPreference.js'
import WearLog from '../../models/WearLog.js'
import Outfit from '../../models/Outfit.js'
import User from '../../models/User.js'
import { updateItemPreferences } from './itemPreferenceUpdater.js'
import { updatePairPreferences } from './pairPreferenceUpdater.js'
import { updateContextPreference } from './contextPreferenceUpdater.js'
import { computeItemScore } from '../recommendation/personalizationService.js'
import { getAllPairs } from '../../utils/pairUtils.js'

// ─────────────────────────────────────────────
// Signal weights — how much each event moves scores
// Kept here so you can tune without touching updaters
// ─────────────────────────────────────────────

export const SIGNAL_WEIGHTS = {
  worn:     { item: 0.20, pair: 0.25, isPositive: true },
  saved:    { item: 0.12, pair: 0.15, isPositive: true },
  shared:   { item: 0.25, pair: 0.20, isPositive: true },
  rated:    { item: 0.15, pair: 0.10, isPositive: true },  // scaled by rating/5
  rejected: { item: -0.15, pair: -0.20, isPositive: false },
  skipped:  { item: -0.05, pair: -0.08, isPositive: false },
}

// ─────────────────────────────────────────────
// Main entry point — called on every user action
// eventType: 'worn' | 'saved' | 'rejected' | 'skipped' | 'shared' | 'rated'
// ─────────────────────────────────────────────

export async function processSignal({
  userId,
  outfitId,
  eventType,
  rating    = null,
  context   = {},
}) {
  try {
    // Fetch the outfit to get its item IDs
    const outfit = await Outfit.findById(outfitId).lean()
    if (!outfit) {
      console.error(`processSignal: outfit ${outfitId} not found`)
      return
    }

    const clothIds = outfit.items.map(i => i.clothId.toString())

    if (clothIds.length === 0) return

    // Run all three preference updates in parallel
    await Promise.all([
      updateItemPreferences({ userId, clothIds, eventType, rating }),
      updatePairPreferences({ userId, clothIds, eventType }),
      updateContextPreference({ userId, clothIds, eventType, context, outfit }),
    ])

    // Update outfit-level wear stats
    if (eventType === 'worn') {
      await Outfit.findByIdAndUpdate(outfitId, {
        $inc: { wearCount: 1 },
        $set: { lastWornAt: new Date() },
      })

      // Update wearCount and costPerWear on individual cloth items
      await updateClothWearStats(clothIds)
    }

    // Update user learningPhase based on total interactions
    await updateLearningPhase(userId)

  } catch (error) {
    // Signal processing is non-fatal
    // The user action already succeeded — don't fail because of learning updates
    console.error('Signal processing error:', error.message)
  }
}

// ─────────────────────────────────────────────
// Update wearCount and costPerWear on cloth items
// ─────────────────────────────────────────────

async function updateClothWearStats(clothIds) {
  const Cloth = (await import('../../models/Cloth.js')).default

  await Promise.all(
    clothIds.map(async (clothId) => {
      const cloth = await Cloth.findByIdAndUpdate(
        clothId,
        {
          $inc: { wearCount: 1 },
          $set: { lastWornAt: new Date() },
        },
        { new: true }
      )

      // Recalculate costPerWear if purchase price is known
      if (cloth?.purchasePrice && cloth.wearCount > 0) {
        await Cloth.findByIdAndUpdate(clothId, {
          costPerWear: parseFloat(
            (cloth.purchasePrice / cloth.wearCount).toFixed(2)
          ),
        })
      }
    })
  )
}

// ─────────────────────────────────────────────
// Update user learningPhase
// Phase advances as total interactions accumulate
// 0 = cold start (< 10 interactions)
// 1 = some data  (10–49 interactions)
// 2 = well personalized (50+ interactions)
// ─────────────────────────────────────────────

async function updateLearningPhase(userId) {
  const totalInteractions = await ItemPreference.aggregate([
    { $match: { userId: new (await import('mongoose')).default.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        total: {
          $sum: {
            $add: [
              '$signals.worn',
              '$signals.saved',
              '$signals.rejected',
              '$signals.skipped',
              '$signals.shared',
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

// ─────────────────────────────────────────────
// Decay runner — called by a scheduled job
// Gradually reduces scores for items not interacted with
// Prevents old taste from dominating forever
// ─────────────────────────────────────────────

export async function runDecay(userId) {
  try {
    const now              = new Date()
    const sixtyDaysAgo    = new Date(now - 60  * 24 * 60 * 60 * 1000)
    const ninetyDaysAgo   = new Date(now - 90  * 24 * 60 * 60 * 1000)
    const oneWeekAgo      = new Date(now - 7   * 24 * 60 * 60 * 1000)

    // Item preference decay
    // Items not interacted with in 60 days lose 5% score per week
    const staleItems = await ItemPreference.find({
      userId,
      $or: [
        { lastInteractedAt: { $lt: sixtyDaysAgo } },
        { lastInteractedAt: { $exists: false } },
      ],
      lastDecayAppliedAt: {
        $not: { $gte: oneWeekAgo }, // only decay once per week
      },
    })

    await Promise.all(
      staleItems.map(async (pref) => {
        const decayedScore = Math.max(0.1, pref.score * 0.95)
        await ItemPreference.findByIdAndUpdate(pref._id, {
          score:              decayedScore,
          lastDecayAppliedAt: now,
        })
      })
    )

    // Pair preference decay
    // Pairs not seen together in 90 days lose 10% affinity per week
    const stalePairs = await PairPreference.find({
      userId,
      $or: [
        { lastSeenTogether: { $lt: ninetyDaysAgo } },
        { lastSeenTogether: { $exists: false } },
      ],
      lastDecayAppliedAt: {
        $not: { $gte: oneWeekAgo },
      },
    })

    await Promise.all(
      stalePairs.map(async (pair) => {
        const decayed = pair.affinityScore * 0.90
        await PairPreference.findByIdAndUpdate(pair._id, {
          affinityScore:      parseFloat(decayed.toFixed(4)),
          lastDecayAppliedAt: now,
        })
      })
    )

    console.log(
      `Decay run for user ${userId}: ${staleItems.length} items, ${stalePairs.length} pairs`
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
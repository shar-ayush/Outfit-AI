import PairPreference from '../../models/PairPreference.js'
import { getCanonicalPairIds, getAllPairs } from '../../utils/pairUtils.js'
import { computePairAffinity } from '../recommendation/personalizationService.js'
import mongoose from 'mongoose'

// ─────────────────────────────────────────────
// Update PairPreference for every pair of items in outfit
// If outfit has 3 items → 3 pairs updated
// If outfit has 4 items → 6 pairs updated
// ─────────────────────────────────────────────

export async function updatePairPreferences({
  userId,
  clothIds,
  eventType,
}) {
  if (clothIds.length < 2) return

  const uid   = typeof userId === 'string'
    ? new mongoose.Types.ObjectId(userId)
    : userId

  const pairs = getAllPairs(clothIds)

  await Promise.all(
    pairs.map(({ itemAId, itemBId }) =>
      updateSinglePair({ userId: uid, itemAId, itemBId, eventType })
    )
  )
}

async function updateSinglePair({ userId, itemAId, itemBId, eventType }) {
  const aidObj = new mongoose.Types.ObjectId(itemAId)
  const bidObj = new mongoose.Types.ObjectId(itemBId)

  const signalIncrement = buildPairSignalIncrement(eventType)

  const pair = await PairPreference.findOneAndUpdate(
    {
      userId,
      itemAId: aidObj,
      itemBId: bidObj,
    },
    {
      $inc: signalIncrement,
      $set: {
        lastSeenTogether: new Date(),
      },
      $setOnInsert: {
        affinityScore: 0.0,
        confidence:    0.0,
      },
    },
    {
      upsert:              true,
      new:                 true,
      setDefaultsOnInsert: true,
    }
  )

  // Recalculate affinity from raw signals
  const newAffinity   = computePairAffinity(pair.signals)
  const newConfidence = computePairConfidence(pair.signals)

  await PairPreference.findByIdAndUpdate(pair._id, {
    affinityScore: parseFloat(newAffinity.toFixed(4)),
    confidence:    parseFloat(newConfidence.toFixed(4)),
  })
}

// ─────────────────────────────────────────────
// Map event type to pair signal field
// ─────────────────────────────────────────────

function buildPairSignalIncrement(eventType) {
  const inc = {
    'signals.shownTogether': 1, // every event means they were shown together
  }

  switch (eventType) {
    case 'worn':
      inc['signals.wornTogether']     = 1
      break
    case 'saved':
      inc['signals.savedTogether']    = 1
      break
    case 'rejected':
      inc['signals.rejectedTogether'] = 1
      break
    default:
      break
  }

  return inc
}

// ─────────────────────────────────────────────
// Pair confidence — grows with co-occurrences
// ─────────────────────────────────────────────

function computePairConfidence(signals) {
  const positive = (signals.wornTogether  || 0) + (signals.savedTogether  || 0)
  const negative = (signals.rejectedTogether || 0)
  const total    = signals.shownTogether || 0

  if (total === 0) return 0.0

  const dataMaturiy  = 1 - Math.exp(-total / 10)
  const qualityRatio = Math.max(0, (positive - negative) / total)

  return Math.min(1.0, dataMaturiy * (0.5 + qualityRatio * 0.5))
}
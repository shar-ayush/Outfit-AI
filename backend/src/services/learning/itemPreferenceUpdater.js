import ItemPreference from '../../models/ItemPreference.js'
import { computeItemScore } from '../recommendation/personalizationService.js'
import mongoose from 'mongoose'

export async function updateItemPreferences({
  userId,
  clothIds,
  eventType,
  rating = null,
}) {
  const uid = typeof userId === 'string'
    ? new mongoose.Types.ObjectId(userId)
    : userId

  await Promise.all(
    clothIds.map(clothId =>
      updateSingleItemPreference({ userId: uid, clothId, eventType, rating })
    )
  )
}

async function updateSingleItemPreference({
  userId,
  clothId,
  eventType,
  rating,
}) {
  const cid = typeof clothId === 'string'
    ? new mongoose.Types.ObjectId(clothId)
    : clothId

  const signalIncrement = buildSignalIncrement(eventType, rating)

  const pref = await ItemPreference.findOneAndUpdate(
    { userId, clothId: cid },
    {
      $inc: signalIncrement.inc,
      $set: {
        lastInteractedAt: new Date(),
        ...(eventType === 'worn' && { lastWornAt: new Date() }),
      },
      $setOnInsert: {
        score:      0.5,
        confidence: 0.0,
      },
    },
    {
      upsert:    true,
      new:       true,
      setDefaultsOnInsert: true,
    }
  )

  const newScore      = computeItemScore(pref.signals)
  const newConfidence = computeConfidence(pref.signals)

  await ItemPreference.findByIdAndUpdate(pref._id, {
    score:      parseFloat(newScore.toFixed(4)),
    confidence: parseFloat(newConfidence.toFixed(4)),
  })
}

function buildSignalIncrement(eventType, rating) {
  const inc = {}

  switch (eventType) {
    case 'worn':
      inc['signals.worn']     = 1
      break
    case 'saved':
      inc['signals.saved']    = 1
      break
    case 'rejected':
      inc['signals.rejected'] = 1
      break
    case 'skipped':
      inc['signals.skipped']  = 1
      break
    case 'shared':
      inc['signals.shared']   = 1
      break
    case 'rated':
      inc['signals.rated']    = 1
      inc['signals.ratingSum'] = rating || 3
      break
    default:
      break
  }

  return { inc }
}

function computeConfidence(signals) {
  const positive = (signals.worn || 0) + (signals.saved || 0) + (signals.shared || 0)
  const negative = (signals.rejected || 0) + (signals.skipped || 0)
  const total    = positive + negative + (signals.rated || 0)

  if (total === 0) return 0.0

  const dataMaturiy = 1 - Math.exp(-total / 15)

  const qualityRatio = total > 0 ? Math.max(0, (positive - negative) / total) : 0.5

  return parseFloat(
    Math.min(1.0, dataMaturiy * (0.6 + qualityRatio * 0.4)).toFixed(4)
  )
}
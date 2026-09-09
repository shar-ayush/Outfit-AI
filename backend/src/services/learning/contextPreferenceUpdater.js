import ContextPreference from '../../models/ContextPreference.js'
import Cloth from '../../models/Cloth.js'
import mongoose from 'mongoose'

const POSITIVE_EVENTS = new Set(['worn', 'saved', 'shared'])

export async function updateContextPreference({
  userId,
  clothIds,
  eventType,
  context = {},
  outfit  = {},
}) {
  if (!POSITIVE_EVENTS.has(eventType)) return

  const uid = typeof userId === 'string'
    ? new mongoose.Types.ObjectId(userId)
    : userId

  const occasion  = outfit.occasion  || context.occasion  || 'general'
  const formality = outfit.formality || context.formality || 'any'
  const contextKey = `${occasion}_${formality}`

  const clothes = await Cloth.find({
    _id: { $in: clothIds.map(id => new mongoose.Types.ObjectId(id)) },
  })
    .select('color pattern style fit fabric')
    .lean()

  if (clothes.length === 0) return

  const colorIncrements   = {}
  const styleIncrements   = {}
  const patternIncrements = {}
  const fitIncrements     = {}

  for (const cloth of clothes) {
    if (cloth.color?.primary) {
      const color = cloth.color.primary.toLowerCase()
      colorIncrements[color] = (colorIncrements[color] || 0) + 1
    }

    if (cloth.pattern) {
      const pat = cloth.pattern.toLowerCase()
      patternIncrements[pat] = (patternIncrements[pat] || 0) + 1
    }

    if (cloth.fit) {
      const fit = cloth.fit.toLowerCase()
      fitIncrements[fit] = (fitIncrements[fit] || 0) + 1
    }

    for (const s of cloth.style || []) {
      const style = s.toLowerCase()
      styleIncrements[style] = (styleIncrements[style] || 0) + 1
    }
  }

  const incUpdate = {}

  for (const [color, count] of Object.entries(colorIncrements)) {
    incUpdate[`colorFrequency.${color}`] = count
  }
  for (const [style, count] of Object.entries(styleIncrements)) {
    incUpdate[`styleFrequency.${style}`] = count
  }
  for (const [pattern, count] of Object.entries(patternIncrements)) {
    incUpdate[`patternFrequency.${pattern}`] = count
  }
  for (const [fit, count] of Object.entries(fitIncrements)) {
    incUpdate[`fitFrequency.${fit}`] = count
  }

  const updated = await ContextPreference.findOneAndUpdate(
    { userId: uid, contextKey },
    {
      $inc: {
        ...incUpdate,
        interactionCount: 1,
      },
      $set: {
        occasion,
        formality,
        lastUpdatedAt: new Date(),
      },
      $setOnInsert: {
        confidence: 0.0,
      },
    },
    {
      upsert:              true,
      new:                 true,
      setDefaultsOnInsert: true,
    }
  )

  const newConfidence = computeContextConfidence(updated.interactionCount)

  await ContextPreference.findByIdAndUpdate(updated._id, {
    confidence: parseFloat(newConfidence.toFixed(4)),
  })
}

function computeContextConfidence(interactionCount) {
  return Math.min(1.0, 1 - Math.exp(-interactionCount / 20))
}
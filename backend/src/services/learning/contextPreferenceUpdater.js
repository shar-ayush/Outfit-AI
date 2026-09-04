import ContextPreference from '../../models/ContextPreference.js'
import Cloth from '../../models/Cloth.js'
import mongoose from 'mongoose'

// ─────────────────────────────────────────────
// Only positive signals build context profiles
// Rejected/skipped outfits don't tell us what
// works in a context — only worn/saved does
// ─────────────────────────────────────────────

const POSITIVE_EVENTS = new Set(['worn', 'saved', 'shared'])

// ─────────────────────────────────────────────
// Update ContextPreference from a signal event
// Builds frequency maps of what attributes
// the user likes in each specific context
// ─────────────────────────────────────────────

export async function updateContextPreference({
  userId,
  clothIds,
  eventType,
  context = {},
  outfit  = {},
}) {
  // Only learn from positive signals
  if (!POSITIVE_EVENTS.has(eventType)) return

  const uid = typeof userId === 'string'
    ? new mongoose.Types.ObjectId(userId)
    : userId

  // Build the context key from the outfit's occasion + formality
  // Falls back to context argument if outfit doesn't have it
  const occasion  = outfit.occasion  || context.occasion  || 'general'
  const formality = outfit.formality || context.formality || 'any'
  const contextKey = `${occasion}_${formality}`

  // Fetch the actual cloth items to get their attributes
  const clothes = await Cloth.find({
    _id: { $in: clothIds.map(id => new mongoose.Types.ObjectId(id)) },
  })
    .select('color pattern style fit fabric')
    .lean()

  if (clothes.length === 0) return

  // Build frequency increments from this outfit's attributes
  const colorIncrements   = {}
  const styleIncrements   = {}
  const patternIncrements = {}
  const fitIncrements     = {}

  for (const cloth of clothes) {
    // Color
    if (cloth.color?.primary) {
      const color = cloth.color.primary.toLowerCase()
      colorIncrements[color] = (colorIncrements[color] || 0) + 1
    }

    // Pattern
    if (cloth.pattern) {
      const pat = cloth.pattern.toLowerCase()
      patternIncrements[pat] = (patternIncrements[pat] || 0) + 1
    }

    // Fit
    if (cloth.fit) {
      const fit = cloth.fit.toLowerCase()
      fitIncrements[fit] = (fitIncrements[fit] || 0) + 1
    }

    // Style — each item can have multiple styles
    for (const s of cloth.style || []) {
      const style = s.toLowerCase()
      styleIncrements[style] = (styleIncrements[style] || 0) + 1
    }
  }

  // Build MongoDB $inc update for nested Map fields
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

  // Upsert the context preference record
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

  // Recalculate confidence from interaction count
  const newConfidence = computeContextConfidence(updated.interactionCount)

  await ContextPreference.findByIdAndUpdate(updated._id, {
    confidence: parseFloat(newConfidence.toFixed(4)),
  })
}

// ─────────────────────────────────────────────
// Context confidence grows with more interactions
// in that specific context
// 5 interactions → ~0.28, 15 → ~0.63, 30 → ~0.86
// ─────────────────────────────────────────────

function computeContextConfidence(interactionCount) {
  return Math.min(1.0, 1 - Math.exp(-interactionCount / 20))
}
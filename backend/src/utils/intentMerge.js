// ─────────────────────────────────────────────
// Merge a freshly-extracted intent onto the previous
// session intent. Only used when isRefinement is true.
// Field-level merge: a refinement that only mentions the
// top color leaves bottom/footwear/mood/etc exactly as
// they were in the previous turn.
// ─────────────────────────────────────────────

export function mergeIntent(previousIntent, newIntent) {
  // Not a refinement, or no prior intent to merge onto — fresh start
  if (!newIntent.isRefinement || !previousIntent) {
    return newIntent
  }

  return {
    messageType: newIntent.messageType,

    occasions:          newIntent.occasions          ?? previousIntent.occasions          ?? null,
    formality:          newIntent.formality          ?? previousIntent.formality          ?? null,
    season:             newIntent.season             ?? previousIntent.season             ?? null,
    weatherSuitability: newIntent.weatherSuitability ?? previousIntent.weatherSuitability ?? null,

    style: newIntent.style && newIntent.style.length > 0
      ? newIntent.style
      : (previousIntent.style || []),

    slotConstraints: mergeSlotConstraints(
      previousIntent.slotConstraints || {},
      newIntent.slotConstraints || {},
      newIntent.resetSlots || []
    ),

    // Exclude constraints: a refinement that adds new exclusions
    // appends to (and de-dupes against) the prior list rather than
    // replacing it — "no heels" earlier + "also nothing black" now
    // should keep both.
    excludeConstraints: mergeExcludeConstraints(
      previousIntent.excludeConstraints || [],
      newIntent.excludeConstraints || []
    ),

    moodDescriptor: newIntent.moodDescriptor ?? previousIntent.moodDescriptor ?? null,
    requestedCount: newIntent.requestedCount || previousIntent.requestedCount || 3,

    isRefinement:          true,
    refinementInstruction: newIntent.refinementInstruction,
  }
}

function mergeSlotConstraints(previous, incoming, resetSlots = []) {
  const slots = new Set([...Object.keys(previous), ...Object.keys(incoming)])
  const merged = {}

  for (const slot of slots) {
    // If this slot was explicitly reset/cleared by the user, do not inherit previous constraints
    if (resetSlots.includes(slot)) {
      if (incoming[slot] && (incoming[slot].color || incoming[slot].subCategory || incoming[slot].pattern)) {
        merged[slot] = incoming[slot]
      }
      continue
    }

    // If incoming explicitly specified this slot in the current turn,
    // the incoming definition takes precedence
    if (incoming[slot]) {
      merged[slot] = incoming[slot]
      continue
    }

    // Otherwise preserve previous constraint for untouched slot
    if (previous[slot]) {
      merged[slot] = previous[slot]
    }
  }

  return merged
}

function mergeExcludeConstraints(previous, incoming) {
  const key = (c) => `${c.slot}_${c.attribute}_${c.value}`
  const seen = new Map()

  for (const c of [...previous, ...incoming]) {
    seen.set(key(c), c)
  }

  return Array.from(seen.values())
}
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
      newIntent.slotConstraints || {}
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

    isRefinement:          true,
    refinementInstruction: newIntent.refinementInstruction,
  }
}

function mergeSlotConstraints(previous, incoming) {
  const slots = new Set([...Object.keys(previous), ...Object.keys(incoming)])
  const merged = {}

  for (const slot of slots) {
    const prev = previous[slot] || {}
    const next = incoming[slot] || {}

    const combined = {
      color:       next.color       ?? prev.color       ?? null,
      subCategory: next.subCategory ?? prev.subCategory ?? null,
      pattern:     next.pattern     ?? prev.pattern      ?? null,
    }

    // Only keep the slot if it actually has something set
    if (combined.color || combined.subCategory || combined.pattern) {
      merged[slot] = combined
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
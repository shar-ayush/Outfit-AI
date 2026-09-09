export function mergeIntent(previousIntent, newIntent) {
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
    if (resetSlots.includes(slot)) {
      if (incoming[slot] && (incoming[slot].color || incoming[slot].subCategory || incoming[slot].pattern)) {
        merged[slot] = incoming[slot]
      }
      continue
    }

    if (incoming[slot]) {
      merged[slot] = incoming[slot]
      continue
    }

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
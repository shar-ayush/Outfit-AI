// ─────────────────────────────────────────────
// Core compatibility rules (unchanged)
// ─────────────────────────────────────────────

const COLOR_HARMONY = {
  white:      { pairs: ['black','navy','beige','grey','brown','olive','burgundy','any'], neutral: true },
  black:      { pairs: ['white','grey','beige','cream','red','pink','any'], neutral: true },
  beige:      { pairs: ['white','black','brown','navy','olive','cream','camel'], neutral: true },
  grey:       { pairs: ['white','black','navy','pink','burgundy','any'], neutral: true },
  cream:      { pairs: ['black','brown','beige','navy','camel'], neutral: true },
  navy:       { pairs: ['white','beige','grey','light blue','cream','brown'], neutral: false },
  'dark blue':{ pairs: ['white','beige','grey','black','brown'], neutral: false },
  brown:      { pairs: ['beige','white','olive','cream','camel','navy'], neutral: false },
  olive:      { pairs: ['beige','white','brown','black','camel'], neutral: false },
  red:        { pairs: ['black','white','navy','grey'], neutral: false },
  pink:       { pairs: ['white','grey','black','beige','navy'], neutral: false },
  burgundy:   { pairs: ['grey','navy','black','white','beige'], neutral: false },
  camel:      { pairs: ['white','black','beige','navy','brown'], neutral: false },
  'light blue':{ pairs: ['white','beige','grey','navy'], neutral: false },
  orange:     { pairs: ['white','black','navy','beige'], neutral: false },
  yellow:     { pairs: ['white','black','navy','grey'], neutral: false },
  purple:     { pairs: ['white','black','grey','beige'], neutral: false },
  green:      { pairs: ['white','beige','brown','black'], neutral: false },
}

const PATTERN_COMPATIBILITY = {
  solid:        { solid: 1.0, stripe: 1.0, check: 1.0, floral: 1.0, graphic: 0.9, abstract: 0.9 },
  stripe:       { solid: 1.0, stripe: 0.5, check: 0.4, floral: 0.3, graphic: 0.4, abstract: 0.5 },
  check:        { solid: 1.0, stripe: 0.4, check: 0.3, floral: 0.3, graphic: 0.4, abstract: 0.5 },
  floral:       { solid: 1.0, stripe: 0.3, check: 0.3, floral: 0.4, graphic: 0.3, abstract: 0.5 },
  graphic:      { solid: 0.9, stripe: 0.4, check: 0.4, floral: 0.3, graphic: 0.4, abstract: 0.5 },
  abstract:     { solid: 0.9, stripe: 0.5, check: 0.5, floral: 0.5, graphic: 0.5, abstract: 0.4 },
  animal_print: { solid: 0.9, stripe: 0.3, check: 0.3, floral: 0.2, graphic: 0.3, abstract: 0.4 },
}

const FORMALITY_COMPATIBILITY = {
  casual:       { casual: 1.0, 'semi-formal': 0.6, formal: 0.1 },
  'semi-formal':{ casual: 0.6, 'semi-formal': 1.0, formal: 0.7 },
  formal:       { casual: 0.1, 'semi-formal': 0.7, formal: 1.0 },
}

const STYLE_ACCEPTABLE_MIX = [
  ['casual',  'minimal'],
  ['casual',  'streetwear'],
  ['minimal', 'formal'],
  ['sporty',  'casual'],
  ['classic', 'minimal'],
  ['preppy',  'classic'],
  ['preppy',  'casual'],
]

// ─────────────────────────────────────────────
// NEW — weights for blending harmony with the
// query-relevance signals (vector similarity,
// constraint match) into the final outfit score.
// Harmony still dominates — these are corrective
// signals, not a replacement for aesthetic scoring.
// ─────────────────────────────────────────────

const FINAL_SCORE_WEIGHTS = {
  harmony:          0.55,
  vectorSimilarity: 0.25,
  constraintMatch:  0.20,
}

const TRIM_SCORE_WEIGHTS = {
  vectorSimilarity: 0.6,
  constraintMatch:  0.4,
}

const DEFAULT_TRIM_LIMIT = 8

// ─────────────────────────────────────────────
// Pair scoring helpers (unchanged)
// ─────────────────────────────────────────────

function getColorScore(c1, c2) {
  if (!c1 || !c2) return 55
  const a = c1.toLowerCase().trim()
  const b = c2.toLowerCase().trim()
  if (a === b) return COLOR_HARMONY[a]?.neutral ? 70 : 40

  const ruleA = COLOR_HARMONY[a]
  if (ruleA?.pairs.includes('any')) return 88
  if (ruleA?.pairs.includes(b))    return 95

  const ruleB = COLOR_HARMONY[b]
  if (ruleB?.pairs.includes('any')) return 88
  if (ruleB?.pairs.includes(a))    return 90

  return 30
}

function getPatternScore(p1, p2) {
  const a = (p1 || 'solid').toLowerCase()
  const b = (p2 || 'solid').toLowerCase()
  return (PATTERN_COMPATIBILITY[a]?.[b] ?? 0.6) * 100
}

function getStyleScore(styles1 = [], styles2 = []) {
  if (!styles1.length || !styles2.length) return 55
  const overlap = styles1.filter(s => styles2.includes(s))
  if (overlap.length > 0) return Math.min(95, 75 + overlap.length * 10)

  const mixOk = STYLE_ACCEPTABLE_MIX.some(([a, b]) =>
    (styles1.includes(a) && styles2.includes(b)) ||
    (styles1.includes(b) && styles2.includes(a))
  )
  return mixOk ? 65 : 35
}

function getFormalityScore(f1, f2) {
  if (!f1 || !f2) return 55
  return (FORMALITY_COMPATIBILITY[f1]?.[f2] ?? 0.5) * 100
}

function getOccasionScore(occasions1 = [], occasions2 = [], target) {
  if (!target) return 60
  const has1 = occasions1.includes(target) ? 1 : 0
  const has2 = occasions2.includes(target) ? 1 : 0
  return ((has1 + has2) / 2) * 100
}

// ─────────────────────────────────────────────
// Score a pair of items (unchanged)
// ─────────────────────────────────────────────

export function scoreItemPair(itemA, itemB, targetOccasion) {
  const color    = getColorScore(itemA.color?.primary, itemB.color?.primary)
  const pattern  = getPatternScore(itemA.pattern, itemB.pattern)
  const style    = getStyleScore(itemA.style, itemB.style)
  const formality = getFormalityScore(itemA.formality, itemB.formality)
  const occasion  = getOccasionScore(itemA.occasions, itemB.occasions, targetOccasion)

  return (
    color    * 0.30 +
    pattern  * 0.15 +
    style    * 0.25 +
    formality * 0.20 +
    occasion  * 0.10
  )
}

// ─────────────────────────────────────────────
// NEW — how well a single item matches the slot
// constraint the user explicitly asked for.
// Returns 0.0 to 1.0. Neutral (0.5) when no
// constraint was given for this slot at all —
// this is intentional: an unconstrained slot
// should never be penalized or rewarded by this term.
// ─────────────────────────────────────────────

export function computeConstraintMatchScore(item, slotConstraint) {
  if (!slotConstraint || (!slotConstraint.color && !slotConstraint.subCategory && !slotConstraint.pattern)) {
    return 0.5
  }

  const checks = []

  if (slotConstraint.color) {
    const itemColor = (item.color?.primary || '').toLowerCase().trim()
    const itemFamily = (item.color?.colorFamily || '').toLowerCase().trim()
    const wantColor = slotConstraint.color.toLowerCase().trim()
    const wantFamily = (slotConstraint.colorFamily || '').toLowerCase().trim()

    if (itemColor === wantColor) {
      checks.push(1.0)
    } else if (
      (itemFamily && itemFamily === wantColor) ||
      (itemColor && (itemColor.includes(wantColor) || wantColor.includes(itemColor)))
    ) {
      checks.push(0.95) // direct match via family or shade (e.g. 'light pink' for 'pink', or 'pink' for 'light pink')
    } else if (
      (wantFamily && itemFamily === wantFamily) ||
      (wantFamily && itemColor.includes(wantFamily))
    ) {
      checks.push(0.7) // same family relaxed search
    } else {
      checks.push(0.15) // present in the pool despite not matching — likely a forced-floor/fallback item
    }
  }

  if (slotConstraint.subCategory) {
    const itemSub = (item.subCategory || '').toLowerCase().trim()
    const wantSub = slotConstraint.subCategory.toLowerCase().trim()
    const isExact = itemSub === wantSub
    const isSubtype = itemSub.includes(wantSub) || wantSub.includes(itemSub)
    checks.push(isExact ? 1.0 : isSubtype ? 0.95 : 0.2)
  }

  if (slotConstraint.pattern) {
    const itemPattern = (item.pattern || '').toLowerCase().trim()
    const wantPattern = slotConstraint.pattern.toLowerCase().trim()
    checks.push(itemPattern === wantPattern ? 1.0 : 0.4)
  }

  return checks.reduce((sum, v) => sum + v, 0) / checks.length
}

// ─────────────────────────────────────────────
// NEW — normalizes an item's retrieval-time
// vectorScore into the 0-1 range this module
// works in. Items with no vectorScore (fixed-
// filter fallback path, or forced-floor items
// that used metadata-only fallback) default to
// a neutral 0.5 rather than being penalized for
// simply lacking the field.
// ─────────────────────────────────────────────

export function computeVectorScoreComponent(item) {
  return typeof item.vectorScore === 'number' ? item.vectorScore : 0.5
}

// ─────────────────────────────────────────────
// NEW — trims a slot's candidate pool down to the
// best `limit` items using vectorScore + constraint
// match only (harmony is pairwise and doesn't apply
// to a single item, so it's intentionally excluded here).
// This runs BEFORE the cartesian product so generateCandidates
// works from a small, high-quality pool per slot.
// ─────────────────────────────────────────────

export function trimPoolBySlot(items, slotConstraint, limit = DEFAULT_TRIM_LIMIT) {
  if (!Array.isArray(items) || items.length <= limit) return items

  return items
    .map(item => {
      const vectorComponent     = computeVectorScoreComponent(item)
      const constraintComponent = computeConstraintMatchScore(item, slotConstraint)
      const trimScore =
        vectorComponent * TRIM_SCORE_WEIGHTS.vectorSimilarity +
        constraintComponent * TRIM_SCORE_WEIGHTS.constraintMatch
      return { item, trimScore }
    })
    .sort((a, b) => b.trimScore - a.trimScore)
    .slice(0, limit)
    .map(({ item }) => item)
}

function trimCandidatePool(candidatePool, slotConstraints = {}) {
  const trimmed = {}
  for (const [category, items] of Object.entries(candidatePool)) {
    if (!Array.isArray(items)) {
      trimmed[category] = items
      continue
    }
    trimmed[category] = trimPoolBySlot(items, slotConstraints[category], DEFAULT_TRIM_LIMIT)
  }
  return trimmed
}

// ─────────────────────────────────────────────
// Score a full outfit — pairwise harmony average,
// now blended with the outfit's average vector
// similarity and average constraint match.
//
// slotConstraints is keyed by category (top/bottom/
// footwear/outerwear) — each item's own `.category`
// field is used to look up its relevant constraint.
// ─────────────────────────────────────────────

export function scoreOutfit(items, targetOccasion, slotConstraints = {}) {
  if (items.length < 2) {
    return {
      total: 50, pairsScored: 0,
      harmony: 50, vectorSimilarity: 0.5, constraintMatch: 0.5,
    }
  }

  const pairScores = []
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      pairScores.push(scoreItemPair(items[i], items[j], targetOccasion))
    }
  }
  const harmonyAvg = pairScores.reduce((s, p) => s + p, 0) / pairScores.length

  const vectorComponents     = items.map(computeVectorScoreComponent)
  const constraintComponents = items.map(item =>
    computeConstraintMatchScore(item, slotConstraints[item.category])
  )
  const vectorAvg     = vectorComponents.reduce((s, v) => s + v, 0) / vectorComponents.length
  const constraintAvg = constraintComponents.reduce((s, v) => s + v, 0) / constraintComponents.length

  const finalTotal =
    harmonyAvg * FINAL_SCORE_WEIGHTS.harmony +
    (vectorAvg * 100) * FINAL_SCORE_WEIGHTS.vectorSimilarity +
    (constraintAvg * 100) * FINAL_SCORE_WEIGHTS.constraintMatch

  return {
    total:            Math.round(finalTotal),
    harmony:          Math.round(harmonyAvg),
    vectorSimilarity: parseFloat(vectorAvg.toFixed(3)),
    constraintMatch:  parseFloat(constraintAvg.toFixed(3)),
    pairsScored:      pairScores.length,
  }
}

// ─────────────────────────────────────────────
// Generate outfit candidates via cartesian product.
// CHANGED: now accepts `intent` instead of just
// `targetOccasion`, so slotConstraints can be read
// and used both for pool trimming and for scoring.
// ─────────────────────────────────────────────

export function generateCandidates(candidatePool, intent = {}, maxCandidates = 500) {
  const targetOccasion  = intent?.occasions || null
  const slotConstraints = intent?.slotConstraints || {}

  const trimmedPool = trimCandidatePool(candidatePool, slotConstraints)

  const { top = [], bottom = [], footwear = [], outerwear = [] } = trimmedPool

  const templates = []

  if (top.length && bottom.length && footwear.length) {
    templates.push([top, bottom, footwear])
  }
  if (top.length && bottom.length && footwear.length && outerwear.length) {
    templates.push([top, bottom, footwear, outerwear])
  }

  const fullBody = trimmedPool.full_body || []
  if (fullBody.length && footwear.length) {
    templates.push([fullBody, footwear])
  }

  const results = []

  for (const template of templates) {
    const shuffled = template.map(slot =>
      [...slot].sort(() => Math.random() - 0.5)
    )
    collectCombinations(shuffled, 0, [], results, maxCandidates, targetOccasion, slotConstraints)
    if (results.length >= maxCandidates) break
  }

  return results.sort((a, b) => b.score.total - a.score.total)
}

function collectCombinations(slots, depth, current, results, cap, targetOccasion, slotConstraints) {
  if (results.length >= cap) return
  if (depth === slots.length) {
    const score = scoreOutfit(current, targetOccasion, slotConstraints)
    results.push({ items: [...current], score })
    return
  }
  for (const item of slots[depth]) {
    collectCombinations(slots, depth + 1, [...current, item], results, cap, targetOccasion, slotConstraints)
    if (results.length >= cap) return
  }
}

// ─────────────────────────────────────────────
// Diversity enforcement (unchanged for now).
// NOTE: this is the >50%-overlap rule that caused
// the original skirt→trousers bug. It is intentionally
// left as-is here — Step 5 (composition) replaces this
// entirely with slot-aware, constraint-respecting
// diversity logic. Do not treat this as fixed yet.
// ─────────────────────────────────────────────


// NOTE - This function selectDiverseOutfits is not used now - it was in old approach
export function selectDiverseOutfits(sortedCandidates, count = 5) {
  const selected  = []
  const usedIds   = new Set()

  for (const candidate of sortedCandidates) {
    if (selected.length >= count) break

    const ids          = candidate.items.map(i => i._id.toString())
    const overlapCount = ids.filter(id => usedIds.has(id)).length
    const overlapRatio = ids.length > 0 ? overlapCount / ids.length : 0

    if (selected.length > 0 && overlapRatio > 0.5) continue

    selected.push(candidate)
    ids.forEach(id => usedIds.add(id))
  }

  return selected
}
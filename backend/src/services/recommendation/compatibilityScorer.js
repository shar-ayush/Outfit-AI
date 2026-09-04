// ─────────────────────────────────────────────
// Core compatibility rules
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
// Pair scoring helpers
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
// Score a pair of items
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
// Score a full outfit — average of all pairs
// ─────────────────────────────────────────────

export function scoreOutfit(items, targetOccasion) {
  if (items.length < 2) return { total: 50, pairsScored: 0 }

  const pairScores = []
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      pairScores.push(scoreItemPair(items[i], items[j], targetOccasion))
    }
  }

  const avg = pairScores.reduce((s, p) => s + p, 0) / pairScores.length

  return {
    total:       Math.round(avg),
    pairsScored: pairScores.length,
  }
}

// ─────────────────────────────────────────────
// Generate outfit candidates via cartesian product
// Shuffles each slot first so results vary across requests
// ─────────────────────────────────────────────

export function generateCandidates(candidatePool, targetOccasion, maxCandidates = 500) {
  const { top = [], bottom = [], footwear = [], outerwear = [] } = candidatePool

  // Define what templates are possible given available items
  const templates = []

  if (top.length && bottom.length && footwear.length) {
    templates.push([top, bottom, footwear])
  }

  if (top.length && bottom.length && footwear.length && outerwear.length) {
    templates.push([top, bottom, footwear, outerwear])
  }

  // full_body items (dresses, jumpsuits)
  const fullBody = candidatePool.full_body || []
  if (fullBody.length && footwear.length) {
    templates.push([fullBody, footwear])
  }

  const results = []

  for (const template of templates) {
    // Shuffle each slot — different results each request
    const shuffled = template.map(slot =>
      [...slot].sort(() => Math.random() - 0.5)
    )
    collectCombinations(shuffled, 0, [], results, maxCandidates, targetOccasion)
    if (results.length >= maxCandidates) break
  }

  return results.sort((a, b) => b.score.total - a.score.total)
}

function collectCombinations(slots, depth, current, results, cap, targetOccasion) {
  if (results.length >= cap) return
  if (depth === slots.length) {
    const score = scoreOutfit(current, targetOccasion)
    results.push({ items: [...current], score })
    return
  }
  for (const item of slots[depth]) {
    collectCombinations(slots, depth + 1, [...current, item], results, cap, targetOccasion)
    if (results.length >= cap) return
  }
}

// ─────────────────────────────────────────────
// Diversity enforcement
// No two selected outfits share more than 50% of items
// ─────────────────────────────────────────────

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
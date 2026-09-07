import { getStructuredModel, getGenerativeModel } from '../../config/gemini.js'
import ApiError from '../../utils/ApiError.js'

// ─────────────────────────────────────────────
// Extract clothing metadata from image
// Called during upload pipeline
// ─────────────────────────────────────────────

export async function extractClothingMetadata(imageBuffer, mimeType = 'image/jpeg') {
  const model = getStructuredModel()

  const imagePart = {
    inlineData: {
      data:     imageBuffer.toString('base64'),
      mimeType,
    },
  }

  const prompt = `
Analyze this clothing item image and extract detailed metadata.
Return ONLY a valid JSON object with exactly this structure:

{
  "category": one of ["top", "bottom", "footwear", "outerwear", "accessory", "full_body"],
  "subCategory": string (e.g. "tshirt", "chinos", "sneakers", "blazer", "dress", "hoodie"),
  "color": {
    "primary": string (most dominant color, use simple names: "white", "black", "navy", "beige", "olive", "red", "pink", "grey", "brown", "camel", "burgundy", "light blue", "dark blue", "cream", "orange", "yellow", "purple", "green"),
    "secondary": array of strings (other visible colors, max 2),
    "colorFamily": string (broader family: "neutral", "blue", "red", "green", "earth", "pastel")
  },
  "pattern": one of ["solid", "stripe", "check", "floral", "graphic", "abstract", "animal_print"],
  "fabric": string (e.g. "cotton", "linen", "denim", "wool", "polyester", "silk", "leather", "synthetic"),
  "fit": one of ["slim", "regular", "oversized", "relaxed", "tailored", "cropped"],
  "style": array of strings from ["casual", "formal", "streetwear", "minimal", "sporty", "ethnic", "bohemian", "preppy", "classic"],
  "formality": one of ["casual", "semi-formal", "formal"],
  "season": array from ["summer", "winter", "spring", "autumn"],
  "occasions": array from ["casual", "office", "formal", "party", "date", "gym", "travel", "wedding", "beach", "college"],
  "weatherSuitability": array from ["hot", "mild", "cold", "rain"],
  "temperatureRange": {
    "min": number in celsius,
    "max": number in celsius
  },
  "aiConfidence": number between 0 and 1,
  "embeddingText": string (a rich natural language description for generating embeddings, 2-3 sentences describing the item comprehensively)
}

Be specific and accurate. The embeddingText should be descriptive enough to retrieve this item in semantic search.
Example embeddingText: "A slim-fit navy blue formal dress shirt in cotton fabric with a solid pattern. Suitable for office and formal occasions in mild to cold weather. Classic and minimal style with semi-formal formality."
  `

  try {
    const result = await model.generateContent([imagePart, prompt])
    const text   = result.response.text()
    const parsed = JSON.parse(text)

    // Validate required fields
    if (!parsed.category || !parsed.color?.primary) {
      throw new ApiError(422, 'Gemini could not extract valid metadata from this image')
    }

    return parsed
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof SyntaxError) {
      throw new ApiError(422, 'Failed to parse Gemini metadata response')
    }
    throw new ApiError(500, `Gemini metadata extraction failed: ${error.message}`)
  }
}

// ─────────────────────────────────────────────
// Batch metadata extraction — multiple images in one call
// Reduces API calls by 5-10x for bulk uploads
// ─────────────────────────────────────────────

export async function extractBatchMetadata(imageBuffers) {
  const model = getStructuredModel()

  const imageParts = imageBuffers.map((buf, i) => [
    {
      inlineData: {
        data:     buf.buffer.toString('base64'),
        mimeType: buf.mimeType || 'image/jpeg',
      },
    },
    { text: `Image ${i + 1}:` },
  ]).flat()

  const prompt = `
I'm showing you ${imageBuffers.length} clothing item images labeled Image 1, Image 2, etc.
Analyze each one and return a JSON array with one object per image in the same order.

Each object must follow this exact schema:
{
  "category": one of ["top", "bottom", "footwear", "outerwear", "accessory", "full_body"],
  "subCategory": string,
  "color": {
    "primary": string,
    "secondary": array of strings,
    "colorFamily": string
  },
  "pattern": one of ["solid", "stripe", "check", "floral", "graphic", "abstract", "animal_print"],
  "fabric": string,
  "fit": one of ["slim", "regular", "oversized", "relaxed", "tailored", "cropped"],
  "style": array of strings from ["casual", "formal", "streetwear", "minimal", "sporty", "ethnic", "bohemian", "preppy", "classic"],
  "formality": one of ["casual", "semi-formal", "formal"],
  "season": array from ["summer", "winter", "spring", "autumn"],
  "occasions": array from ["casual", "office", "formal", "party", "date", "gym", "travel", "wedding", "beach", "college"],
  "weatherSuitability": array from ["hot", "mild", "cold", "rain"],
  "temperatureRange": { "min": number, "max": number },
  "aiConfidence": number between 0 and 1,
  "embeddingText": string
}

Return ONLY the JSON array. No explanation. No markdown.
  `

  try {
    const result = await model.generateContent([...imageParts, prompt])
    const text   = result.response.text()
    const parsed = JSON.parse(text)

    if (!Array.isArray(parsed)) {
      throw new ApiError(422, 'Batch extraction did not return an array')
    }

    return parsed
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof SyntaxError) {
      throw new ApiError(422, 'Failed to parse batch Gemini response')
    }
    throw new ApiError(500, `Batch metadata extraction failed: ${error.message}`)
  }
}

// ─────────────────────────────────────────────
// Generate outfit reasoning for final selected outfits
// Single call for all outfits — not one per outfit
// ─────────────────────────────────────────────

export async function generateOutfitReasonings(outfits, userQuery, intent) {
  const model = getStructuredModel()

  const outfitSummaries = outfits.map((outfit, i) => ({
    index: i,
    compatibilityScore: outfit.score?.total,
    items: outfit.items.map(item => ({
      category:    item.category,
      color:       item.color?.primary,
      style:       item.style,
      formality:   item.formality,
      pattern:     item.pattern || 'solid',
      description: item.embeddingText || `${item.color?.primary} ${item.category}`,
    })),
  }))

  const prompt = `
You are a personal stylist AI.

User request: "${userQuery}"
Occasion: ${intent?.occasions || 'general'}
Formality: ${intent?.formality || 'any'}

Generate a name, "why it works" explanation, and styling tip for each outfit.
Each outfit should have a DIFFERENT name and feel — vary the vibe and energy.
Be specific about the actual colors and items in each outfit.

Outfits:
${JSON.stringify(outfitSummaries, null, 2)}

Return a JSON array with exactly ${outfits.length} objects:
[
  {
    "index": 0,
    "outfitName": "<short evocative name, max 4 words>",
    "whyItWorks": "<1 sentence, specific to colors and styles in this combination>",
    "stylingTip": "<1 concrete actionable tip>",
    "vibe": "<1 word: minimal, bold, classic, relaxed, sharp, effortless, etc>"
  }
]
  `

  try {
    const result = await model.generateContent(prompt)
    const parsed = JSON.parse(result.response.text())
    return Array.isArray(parsed) ? parsed : []
  } catch {
    // Return empty — caller handles fallback
    return []
  }
}

// ─────────────────────────────────────────────
// Outfit composition — replaces llmReRankOutfits.
// Instead of blindly re-ranking a top-15 list, this
// selects final outfits with explicit awareness of
// which slots the user locked (slotConstraints) and
// which they didn't — enforcing variety only on the
// free slots, and requiring an honest explanation
// whenever a locked slot couldn't be satisfied exactly.
// ─────────────────────────────────────────────

export async function composeOutfitsFromPool(candidates, userQuery, conversationHistory = [], intent, count = 3) {
  const model = getStructuredModel()

  const recentHistory = conversationHistory.slice(-6).map(m => ({
    role:    m.role,
    content: m.content,
  }))

  const slotConstraints = intent?.slotConstraints || {}
  const lockedSlots = Object.keys(slotConstraints).filter(slot => {
    const c = slotConstraints[slot]
    return c && (c.color || c.subCategory || c.pattern)
  })

  const candidateSummaries = candidates.map((combo, i) => ({
    index:            i,
    algorithmScore:   combo.score?.total,
    harmony:          combo.score?.harmony,
    vectorSimilarity: combo.score?.vectorSimilarity,
    constraintMatch:  combo.score?.constraintMatch,
    items: combo.items.map(item => ({
      category:    item.category,
      color:       item.color?.primary,
      subCategory: item.subCategory,
      style:       item.style,
      formality:   item.formality,
      pattern:     item.pattern || 'solid',
    })),
  }))

  const prompt = `
You are a personal stylist AI composing final outfit picks from pre-scored candidates.

User's original message: "${userQuery}"
Occasion: ${intent?.occasions || 'general'}
Formality: ${intent?.formality || 'any'}
Mood/vibe requested: ${intent?.moodDescriptor || 'none'}
Is refinement: ${intent?.isRefinement || false}
${intent?.refinementInstruction ? `Refinement instruction: ${intent.refinementInstruction}` : ''}

LOCKED SLOTS (user explicitly requested these — must be honored unless truly no candidate satisfies them):
${lockedSlots.length > 0 ? JSON.stringify(slotConstraints, null, 2) : 'None — user did not lock any specific slot.'}

EXCLUSIONS (must NEVER appear in any selected outfit):
${JSON.stringify(intent?.excludeConstraints || [])}

${recentHistory.length > 0 ? `Conversation context:\n${JSON.stringify(recentHistory, null, 2)}\n` : ''}

Pre-scored candidates (already ranked by an algorithm combining color harmony,
semantic similarity to the query, and constraint match):
${JSON.stringify(candidateSummaries, null, 2)}

TASK: Select ${count} of these candidates as the final outfits to show the user.

RULES:
1. NEVER select a candidate that violates an EXCLUSION — this is a hard rule, no exceptions.
2. For LOCKED slots, strongly prefer candidates where that slot's item matches the
   constraint exactly. If NONE of the candidates satisfy a locked slot, you may select
   the closest available option — but you MUST say so plainly in whyItWorks (e.g.
   "styled with your white trousers here since no second white skirt was available").
3. Enforce variety ONLY on slots that are NOT locked. Two outfits may legitimately
   share every locked-slot item if the wardrobe only supports one good option there —
   that is correct behavior, not a bug. Vary outerwear, footwear, style, or accessories
   (whichever are unconstrained) to make the ${count} outfits feel genuinely distinct.
4. Give each outfit a different name and a different vibe word.
5. Do not select the exact same candidate index more than once.

Return ONLY a JSON array of exactly ${count} objects:
[
  {
    "selectedIndex": <number from the candidates list>,
    "outfitName": "<4 words max>",
    "whyItWorks": "<specific to colors/items in this outfit; MUST mention any constraint substitution>",
    "stylingTip": "<1 concrete actionable tip>",
    "vibe": "<1 word>",
    "constraintsSatisfied": <true if all locked slots matched exactly, false if any substitution occurred>,
    "substitutionNote": "<what was substituted and why, or null if constraintsSatisfied is true>"
  }
]
  `

  try {
    const result     = await model.generateContent(prompt)
    const selections = JSON.parse(result.response.text())

    return selections.map(selection => {
      const combo = candidates[selection.selectedIndex] || candidates[0]
      return {
        items:      combo.items,
        score:      combo.score,
        outfitName: selection.outfitName || 'Curated Outfit',
        whyItWorks: selection.whyItWorks || 'A well-matched combination.',
        stylingTip: selection.stylingTip || 'Wear with confidence.',
        vibe:       selection.vibe || 'classic',
        constraintsSatisfied: selection.constraintsSatisfied !== false,
        substitutionNote:     selection.substitutionNote || null,
      }
    })
  } catch (error) {
    console.error('composeOutfitsFromPool failed, falling back to top algorithmic candidates:', error.message)
    // Fallback — same safety net pattern as the old llmReRankOutfits catch block
    return candidates.slice(0, count).map((combo, i) => ({
      items:      combo.items,
      score:      combo.score,
      outfitName: `Outfit ${i + 1}`,
      whyItWorks: `Compatibility score: ${combo.score?.total}/100`,
      stylingTip: 'A solid combination from your wardrobe.',
      vibe:       'classic',
      constraintsSatisfied: null,
      substitutionNote:     'Fallback selection — composition step failed, constraints not verified.',
    }))
  }
}

// ─────────────────────────────────────────────
// Single-outfit retry — called only when verification
// finds an unexplained constraint violation. Re-composes
// exactly one replacement outfit from the same candidate
// pool, explicitly excluding the items that just failed,
// with stricter framing than the original compose prompt.
// ─────────────────────────────────────────────

export async function recomposeSingleOutfit(candidates, userQuery, intent, excludeItemIds = []) {
  const model = getStructuredModel()
  const slotConstraints = intent?.slotConstraints || {}

  // Prefer candidates that don't fully reuse the failed outfit's items,
  // but fall back to the full pool if nothing else is available —
  // a small wardrobe may not have a genuinely different option.
  const filtered = candidates.filter(c =>
    !c.items.every(item => excludeItemIds.includes(item._id.toString()))
  )
  const pool = filtered.length > 0 ? filtered : candidates

  const candidateSummaries = pool.map((combo, i) => ({
    index:           i,
    algorithmScore:  combo.score?.total,
    constraintMatch: combo.score?.constraintMatch,
    items: combo.items.map(item => ({
      category:    item.category,
      color:       item.color?.primary,
      subCategory: item.subCategory,
      pattern:     item.pattern || 'solid',
      style:       item.style,
      formality:   item.formality,
    })),
  }))

  const prompt = `
A previous outfit selection failed constraint verification with no valid justification —
it violated the user's request without explaining why. Select ONE replacement that
STRICTLY satisfies every locked slot below. Only accept an imperfect match if truly no
exact candidate exists — and if so, you MUST explain the substitution honestly.

User's original message: "${userQuery}"
Locked slot constraints: ${JSON.stringify(slotConstraints, null, 2)}
Exclusions (must never appear): ${JSON.stringify(intent?.excludeConstraints || [])}

Candidates:
${JSON.stringify(candidateSummaries, null, 2)}

Return ONLY one JSON object:
{
  "selectedIndex": <number>,
  "outfitName": "<4 words max>",
  "whyItWorks": "<specific; must mention any remaining substitution>",
  "stylingTip": "<1 tip>",
  "vibe": "<1 word>",
  "constraintsSatisfied": boolean,
  "substitutionNote": string or null
}
  `

  try {
    const result    = await model.generateContent(prompt)
    const selection = JSON.parse(result.response.text())
    const combo     = pool[selection.selectedIndex] || pool[0]

    return {
      items:      combo.items,
      score:      combo.score,
      outfitName: selection.outfitName || 'Curated Outfit',
      whyItWorks: selection.whyItWorks || 'A well-matched combination.',
      stylingTip: selection.stylingTip || 'Wear with confidence.',
      vibe:       selection.vibe || 'classic',
      constraintsSatisfied: selection.constraintsSatisfied !== false,
      substitutionNote:     selection.substitutionNote || null,
    }
  } catch (error) {
    console.error('recomposeSingleOutfit failed:', error.message)
    return null // caller keeps the original, unresolved outfit rather than losing it entirely
  }
}
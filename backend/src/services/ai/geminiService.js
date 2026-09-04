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
// LLM re-ranking — takes top 15 algorithm candidates
// applies nuanced re-ranking based on user query + conversation history
// ─────────────────────────────────────────────

export async function llmReRankOutfits(candidates, userQuery, conversationHistory = [], intent, count = 3) {
  const model = getStructuredModel()

  const recentHistory = conversationHistory.slice(-6).map(m => ({
    role:    m.role,
    content: m.content,
  }))

  const candidateSummaries = candidates.map((combo, i) => ({
    index:             i,
    algorithmScore:    combo.score?.total,
    items: combo.items.map(item => ({
      category:    item.category,
      color:       item.color?.primary,
      style:       item.style,
      formality:   item.formality,
      pattern:     item.pattern || 'solid',
      description: item.embeddingText || `${item.color?.primary} ${item.category}`,
    })),
  }))

  const prompt = `
You are a personal stylist AI. A compatibility algorithm pre-scored these outfit combinations.
Re-rank and select the best ${count} considering the user's actual intent and nuance.

User message: "${userQuery}"
Occasion: ${intent?.occasions || 'general'}
Formality: ${intent?.formality || 'any'}
Is refinement: ${intent?.isRefinement || false}
${intent?.refinementInstruction ? `Refinement: ${intent.refinementInstruction}` : ''}

${recentHistory.length > 0 ? `
Conversation context (do not repeat already suggested outfits):
${JSON.stringify(recentHistory, null, 2)}
` : ''}

Pre-scored candidates:
${JSON.stringify(candidateSummaries, null, 2)}

Select ${count} outfits with genuine variety — different vibes, not just different items.
If this is a refinement request, honor the user's instruction even if a lower-scored outfit fits better.

Return JSON array of exactly ${count} objects:
[
  {
    "selectedIndex": <number from candidates list>,
    "outfitName": "<4 words max>",
    "whyItWorks": "<specific to colors and styles in this outfit>",
    "stylingTip": "<1 concrete actionable tip>",
    "vibe": "<1 word>"
  }
]
  `

  try {
    const result    = await model.generateContent(prompt)
    const selections = JSON.parse(result.response.text())

    return selections.map(selection => {
      const combo = candidates[selection.selectedIndex] || candidates[0]
      return {
        items: combo.items,
        score: combo.score,
        outfitName: selection.outfitName || 'Curated Outfit',
        whyItWorks: selection.whyItWorks || 'A well-matched combination.',
        stylingTip: selection.stylingTip || 'Wear with confidence.',
        vibe:       selection.vibe || 'classic',
      }
    })
  } catch {
    // Fallback — return top scored without LLM reasoning
    return candidates.slice(0, count).map((combo, i) => ({
      items:      combo.items,
      score:      combo.score,
      outfitName: `Outfit ${i + 1}`,
      whyItWorks: `Compatibility score: ${combo.score?.total}/100`,
      stylingTip: 'A solid combination from your wardrobe.',
      vibe:       'classic',
    }))
  }
}
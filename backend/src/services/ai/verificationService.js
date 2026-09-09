import { getStructuredModel } from '../../config/gemini.js'

export const MAX_RETRIES_PER_OUTFIT = 1

export async function verifyOutfitConstraints(outfits, intent) {
  const slotConstraints    = intent?.slotConstraints || {}
  const excludeConstraints = intent?.excludeConstraints || []

  const hasConstraints = Object.keys(slotConstraints).length > 0 || excludeConstraints.length > 0

  if (!hasConstraints) {
    return outfits.map((_, i) => ({
      outfitIndex: i, satisfied: true, violations: [], justification: null,
    }))
  }

  const model = getStructuredModel()

  const outfitSummaries = outfits.map((outfit, i) => ({
    outfitIndex: i,
    items: outfit.items.map(item => ({
      category:    item.category,
      color:       item.color?.primary,
      colorFamily: item.color?.colorFamily,
      subCategory: item.subCategory,
      pattern:     item.pattern,
    })),
    whyItWorks:       outfit.whyItWorks,
    substitutionNote: outfit.substitutionNote || null,
  }))

  const prompt = `
You are an independent auditor checking whether outfits satisfy a user's explicit requests.
Verify directly against the raw item attributes below — do not simply trust whatever
"whyItWorks" or "substitutionNote" already claims.

Slot constraints the user required:
${JSON.stringify(slotConstraints, null, 2)}

Exclusions the user required (must NEVER appear in any outfit):
${JSON.stringify(excludeConstraints, null, 2)}

Outfits to audit:
${JSON.stringify(outfitSummaries, null, 2)}

For EACH outfit:
1. Check every locked slot's item against its constraint (color/subCategory/pattern).
   NOTE: Color shades (e.g. 'light pink' or 'hot pink' for 'pink', 'navy blue' for 'blue')
   fully satisfy the color constraint and are NOT violations.
2. Check whether the outfit contains anything listed in exclusions.

If a locked slot doesn't match (and is not a valid shade/family match), look at whether the outfit's own whyItWorks/
substitutionNote already gives a real explanation (e.g. "no second white skirt existed").
If a genuine explanation is present, mark satisfied: false but carry that justification
through. If there is NO explanation for a mismatch, mark satisfied: false with
justification: null — this specifically signals an unexplained violation.

Exclusion violations are ALWAYS satisfied: false, justification: null — there is never
an acceptable reason to include something the user explicitly excluded.

Return ONLY a JSON array, one object per outfit, in outfitIndex order:
[
  {
    "outfitIndex": 0,
    "satisfied": boolean,
    "violations": [{ "slot": string, "expected": string, "got": string, "violationType": "constraint" | "exclusion" }],
    "justification": string or null
  }
]
  `

  try {
    const result = await model.generateContent(prompt)
    const parsed = JSON.parse(result.response.text())
    if (!Array.isArray(parsed)) throw new Error('Verification did not return an array')
    return parsed
  } catch (error) {
    console.error('verifyOutfitConstraints failed, failing open:', error.message)
    return outfits.map((_, i) => ({
      outfitIndex: i, satisfied: true, violations: [],
      justification: 'Verification step unavailable — not independently checked.',
    }))
  }
}
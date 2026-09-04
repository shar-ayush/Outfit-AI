// Always store pair in canonical order (smaller ID first)
// Prevents duplicate pairs (A,B) and (B,A) in PairPreference
export function getCanonicalPairIds(idA, idB) {
  const strA = idA.toString()
  const strB = idB.toString()
  return strA < strB
    ? { itemAId: strA, itemBId: strB }
    : { itemAId: strB, itemBId: strA }
}

// Generate all unique pairs from an array of IDs
export function getAllPairs(ids) {
  const pairs = []
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      pairs.push(getCanonicalPairIds(ids[i], ids[j]))
    }
  }
  return pairs
}
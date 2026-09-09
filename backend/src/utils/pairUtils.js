export function getCanonicalPairIds(idA, idB) {
  const strA = idA.toString()
  const strB = idB.toString()
  return strA < strB
    ? { itemAId: strA, itemBId: strB }
    : { itemAId: strB, itemBId: strA }
}

export function getAllPairs(ids) {
  const pairs = []
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      pairs.push(getCanonicalPairIds(ids[i], ids[j]))
    }
  }
  return pairs
}
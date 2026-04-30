/**
 * Pure n-gram diff: how much of `actual` is NOT present in `derived`?
 *
 * gap = |actual_shingles \ derived_shingles| / |actual_shingles|
 *
 * Range: 0 (all derivable) → 1 (entirely human-written).
 */

const SHINGLE_N = 3

export function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9_-]+/g) ?? []
}

export function shingles(text: string, n: number = SHINGLE_N): Set<string> {
  const tokens = tokenize(text)
  const out = new Set<string>()
  for (let i = 0; i + n <= tokens.length; i++) {
    out.add(tokens.slice(i, i + n).join(' '))
  }
  return out
}

/** Returns the fraction of `actual` shingles not present in `derived`. */
export function generationGap(actual: string, derived: string): number {
  const a = shingles(actual)
  const d = shingles(derived)
  if (a.size === 0) return 0
  let novel = 0
  for (const sh of a) if (!d.has(sh)) novel++
  return novel / a.size
}

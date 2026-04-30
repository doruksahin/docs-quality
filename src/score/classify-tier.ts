import { getBand } from '../parse/scope-bands.js'
import type { CheckFinding } from '../types/finding.js'
import type { ParsedClaudeMd } from '../types/parsed.js'
import type { Tier, TierGrade } from '../types/grade.js'

/**
 * Pure: produces a tier from line-count, scope, finding counts, and
 * generation-gap. The decision tree:
 *
 *   Errors first (4+ → F, 2-3 → D, 1 → C).
 *   Then lines: ≥ errorAt × 1.5 → F, ≥ errorAt → D, ≥ warnAt → C.
 *   Then genGap: < 0.4 → D, < 0.5 → C, < 0.6 → B.
 *   With 0 errors, lines < warnAt, gap ≥ 0.6:
 *     A if lines ≤ targetMax × 1.2 (modest flex), warnings ≤ 2, gap ≥ 0.75.
 *     B otherwise (info findings are not penalty-bearing).
 *
 * `info` severity does NOT downgrade A→B. Only warning and error counts do.
 */
export function classifyTier(parsed: ParsedClaudeMd, findings: readonly CheckFinding[], genGap: number): TierGrade {
  const band = getBand(parsed.scope)
  const lines = parsed.lineCount

  let errorCount = 0
  let warningCount = 0
  let infoCount = 0
  for (const f of findings) {
    if (f.severity === 'error') errorCount++
    else if (f.severity === 'warning') warningCount++
    else infoCount++
  }

  const tier: Tier = (() => {
    if (errorCount >= 4 || lines >= band.errorAt * 1.5) return 'F'
    if (errorCount >= 2 || lines >= band.errorAt || genGap < 0.4) return 'D'
    if (errorCount >= 1 || lines >= band.warnAt || genGap < 0.5) return 'C'
    if (genGap < 0.6) return 'B'

    const flexMax = Math.max(band.targetMax * 1.2, band.targetMax + 10)
    if (warningCount <= 2 && lines <= flexMax && genGap >= 0.75) return 'A'
    return 'B'
  })()

  return { tier, genGap, errorCount, warningCount, infoCount }
}

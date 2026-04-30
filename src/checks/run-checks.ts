import type { DocCheck, CheckContext } from '../types/check.js'
import type { CheckFinding } from '../types/finding.js'
import type { ParsedClaudeMd } from '../types/parsed.js'

/**
 * Apply each rule to a parsed CLAUDE.md and concatenate findings, sorted by line.
 * Pure: no I/O, the context's pre-loaded sets are the only external state.
 */
export function runChecks(parsed: ParsedClaudeMd, rules: readonly DocCheck[], ctx: CheckContext): CheckFinding[] {
  const findings: CheckFinding[] = []
  for (const rule of rules) {
    findings.push(...rule.run(parsed, ctx))
  }
  return findings.sort((a, b) => a.line - b.line)
}

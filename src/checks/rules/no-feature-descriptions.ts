import type { DocCheck } from '../../types/check.js'
import type { CheckFinding } from '../../types/finding.js'
import type { ParsedClaudeMd } from '../../types/parsed.js'

/**
 * Flags sections that describe what a feature does instead of guiding what to do.
 * Conservative: only flags obvious cases to keep false-positive rate low.
 *
 * A section is flagged when the heading matches the descriptive pattern AND
 * the body has ≥3 sentences AND contains no second-person ("you") or imperative
 * forms ("use", "add", "do", "run", "see", "prefer").
 */

const DESCRIPTIVE_HEADING = /^(How\s+\w+\s+(?:works|flows?)|The\s+\w+\s+(?:Pipeline|Flow|System)|Auto-\w+\s+Mode|.*\s+Internals?)$/i
const IMPERATIVE_HINTS = ['you ', 'use ', 'add ', 'do ', 'run ', 'see ', 'prefer ', 'avoid ', 'never ', 'always ']
const MIN_SENTENCES = 3

function countSentences(text: string): number {
  return text.split(/[.!?](?:\s|$)/).filter((s) => s.trim().length > 5).length
}

function hasImperative(text: string): boolean {
  const lower = text.toLowerCase()
  return IMPERATIVE_HINTS.some((p) => lower.includes(p))
}

const check: DocCheck = {
  name: 'no-feature-descriptions',
  description: 'Flags "how X works" prose sections — descriptions belong in README.md.',

  run(parsed: ParsedClaudeMd): CheckFinding[] {
    const findings: CheckFinding[] = []

    for (const section of parsed.sections) {
      if (!DESCRIPTIVE_HEADING.test(section.title.trim())) continue
      if (countSentences(section.bodyText) < MIN_SENTENCES) continue
      if (hasImperative(section.bodyText)) continue

      findings.push({
        check: this.name,
        severity: 'info',
        line: section.line,
        message: `Section "${section.title}" reads as a feature description, not guidance.`,
        hint: 'Move to README.md or replace with a one-line link to the owning module.',
      })
    }

    return findings
  },
}

export default check

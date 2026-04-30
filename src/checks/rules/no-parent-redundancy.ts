import type { DocCheck } from '../../types/check.js'
import type { CheckFinding } from '../../types/finding.js'
import type { MdSection, ParsedClaudeMd } from '../../types/parsed.js'

/**
 * Flags sections whose body text is ≥85% similar to a section with the same
 * title in an ancestor CLAUDE.md — the "parent/child redundancy" anti-pattern.
 *
 * Similarity: token-set Jaccard on lowercased word-shingles (n=3).
 */

const SHINGLE_N = 3
const SIMILARITY_THRESHOLD = 0.85
const MIN_BODY_LENGTH = 40

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9_-]+/g) ?? []
}

function shingles(text: string, n: number): Set<string> {
  const tokens = tokenize(text)
  const out = new Set<string>()
  for (let i = 0; i + n <= tokens.length; i++) {
    out.add(tokens.slice(i, i + n).join(' '))
  }
  return out
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let intersection = 0
  for (const x of a) if (b.has(x)) intersection++
  const union = a.size + b.size - intersection
  return union === 0 ? 0 : intersection / union
}

function findMatchingParentSection(child: MdSection, parent: ParsedClaudeMd): MdSection | null {
  const childTitle = child.title.toLowerCase().trim()
  if (!childTitle) return null
  for (const parentSection of parent.sections) {
    if (parentSection.title.toLowerCase().trim() === childTitle) return parentSection
  }
  return null
}

const check: DocCheck = {
  name: 'no-parent-redundancy',
  description: 'Flags sections whose body duplicates an ancestor CLAUDE.md section with the same title.',

  run(parsed: ParsedClaudeMd, ctx): CheckFinding[] {
    if (!ctx.parent) return []
    const findings: CheckFinding[] = []

    for (const section of parsed.sections) {
      if (section.bodyText.length < MIN_BODY_LENGTH) continue
      const match = findMatchingParentSection(section, ctx.parent)
      if (!match || match.bodyText.length < MIN_BODY_LENGTH) continue

      const sim = jaccard(shingles(section.bodyText, SHINGLE_N), shingles(match.bodyText, SHINGLE_N))
      if (sim < SIMILARITY_THRESHOLD) continue

      findings.push({
        check: this.name,
        severity: 'warning',
        line: section.line,
        message: `Section "${section.title}" duplicates ${ctx.parent.relPath} (similarity ${sim.toFixed(2)}).`,
        hint: `Replace with a link to ${ctx.parent.relPath}#${section.title.toLowerCase().replace(/\s+/g, '-')} or delete.`,
      })
    }

    return findings
  },
}

export default check

import type { DocCheck } from '../../types/check.js'
import type { CheckFinding } from '../../types/finding.js'
import type { ParsedClaudeMd } from '../../types/parsed.js'

/**
 * Flags sections that restate rules already enforced by eslint or AST checks.
 *
 * Signals:
 *   - body mentions "boundaries" or "Layer N may not import from Layer M"
 *   - body mentions an AST-check id verbatim (e.g. "no-type-assertion")
 *
 * Acceptable: the section *links* to the enforcing tool (we look for the link
 * to make the section pass — heuristic but conservative).
 */

const LAYER_RULE_RE = /Layer\s+\d+\s+(?:may\s+not|cannot|must\s+not)\s+import/i
const BOUNDARY_PHRASES = ['boundaries/element-types', 'eslint-plugin-boundaries']

function mentionsAstCheck(body: string, astCheckIds: ReadonlySet<string>): string | null {
  for (const id of astCheckIds) {
    if (body.includes(id)) return id
  }
  return null
}

function bodyLinksToTooling(body: string): boolean {
  return /eslint\.config|ast-checks|lint:layers|scripts\/ast-checks/i.test(body)
}

const check: DocCheck = {
  name: 'no-tooling-restated',
  description: 'Flags rules already enforced by eslint or AST checks unless the body links to the tool.',

  run(parsed: ParsedClaudeMd, ctx): CheckFinding[] {
    const findings: CheckFinding[] = []

    for (const section of parsed.sections) {
      const body = section.bodyText
      if (!body) continue

      const isBoundary = LAYER_RULE_RE.test(body) || BOUNDARY_PHRASES.some((p) => body.includes(p))
      const astHit = mentionsAstCheck(body, ctx.astCheckIds)

      if (!isBoundary && !astHit) continue
      if (bodyLinksToTooling(body)) continue

      findings.push({
        check: this.name,
        severity: 'info',
        line: section.line,
        message: isBoundary
          ? `Section "${section.title}" restates a layer/boundary rule enforced by eslint-plugin-boundaries.`
          : `Section "${section.title}" mentions AST check "${astHit}" without linking to its definition.`,
        hint: isBoundary
          ? 'Replace with: "Layer imports enforced by eslint-plugin-boundaries — see eslint.config.mjs."'
          : `Add a link to apps/desktop/scripts/ast-checks/checks/${astHit}.ts or remove the restatement.`,
      })
    }

    return findings
  },
}

export default check

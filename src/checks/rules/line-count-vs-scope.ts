import type { DocCheck } from '../../types/check.js'
import type { CheckFinding } from '../../types/finding.js'
import type { ParsedClaudeMd } from '../../types/parsed.js'
import { getBand } from '../../parse/scope-bands.js'

/**
 * Flags CLAUDE.md files exceeding the line-count target for their scope tier.
 * Band data lives in parse/scope-bands.ts so score/classify-tier.ts can share it.
 */

const check: DocCheck = {
  name: 'line-count-vs-scope',
  description: 'Flags CLAUDE.md files exceeding the target line-count band for their scope tier.',

  run(parsed: ParsedClaudeMd): CheckFinding[] {
    const band = getBand(parsed.scope)
    const lines = parsed.lineCount
    if (lines <= band.targetMax) return []

    if (lines >= band.errorAt) {
      return [{
        check: this.name,
        severity: 'error',
        line: 1,
        message: `${lines} lines exceeds ${parsed.scope} error threshold (${band.errorAt}). Target: ${band.targetMin}-${band.targetMax}.`,
        hint: 'Cut by 60-70%; move feature descriptions to README.md, delete file inventories, link to subdirectory CLAUDE.md files.',
      }]
    }

    if (lines >= band.warnAt) {
      return [{
        check: this.name,
        severity: 'warning',
        line: 1,
        message: `${lines} lines exceeds ${parsed.scope} warn threshold (${band.warnAt}). Target: ${band.targetMin}-${band.targetMax}.`,
        hint: 'Trim by ~30%; remove derivable content and lengthy code examples.',
      }]
    }

    return [{
      check: this.name,
      severity: 'info',
      line: 1,
      message: `${lines} lines is above ${parsed.scope} target (${band.targetMin}-${band.targetMax}) but within band.`,
    }]
  },
}

export default check

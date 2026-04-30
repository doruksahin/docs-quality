import { describe, it, expect } from 'vitest'
import { classifyTier } from '../src/score/classify-tier.js'
import type { ParsedClaudeMd, ScopeKind } from '../src/types/parsed.js'
import type { CheckFinding } from '../src/types/finding.js'

function fakeParsed(scope: ScopeKind, lines: number): ParsedClaudeMd {
  return {
    path: '/x/CLAUDE.md',
    relPath: 'x/CLAUDE.md',
    scope,
    siblingCodeFileCount: 5,
    lineCount: lines,
    raw: '',
    sections: [],
    tables: [],
    codeBlocks: [],
    gitLastModified: null,
    sourceDir: '/x',
  }
}

function err(): CheckFinding {
  return { check: 'x', severity: 'error', line: 1, message: 'x' }
}
function warn(): CheckFinding {
  return { check: 'x', severity: 'warning', line: 1, message: 'x' }
}
function info(): CheckFinding {
  return { check: 'x', severity: 'info', line: 1, message: 'x' }
}

describe('classifyTier', () => {
  it('A — leaf within target, 0 findings, gap=1', () => {
    expect(classifyTier(fakeParsed('leaf', 20), [], 1.0).tier).toBe('A')
  })

  it('A — leaf at flexMax (target * 1.2), 0 errors, gap >= 0.75', () => {
    // leaf targetMax=30, flex=36
    expect(classifyTier(fakeParsed('leaf', 36), [], 0.8).tier).toBe('A')
  })

  it('A — info-severity findings do not downgrade', () => {
    expect(classifyTier(fakeParsed('leaf', 20), [info(), info(), info()], 1.0).tier).toBe('A')
  })

  it('B — over flexMax but under warn band', () => {
    // leaf flex=36, warn=50 → 42 falls in B band
    expect(classifyTier(fakeParsed('leaf', 42), [], 1.0).tier).toBe('B')
  })

  it('B — gap below 0.75 but above 0.6', () => {
    expect(classifyTier(fakeParsed('leaf', 20), [], 0.65).tier).toBe('B')
  })

  it('B — three warnings (>2)', () => {
    expect(classifyTier(fakeParsed('leaf', 20), [warn(), warn(), warn()], 1.0).tier).toBe('B')
  })

  it('C — one error', () => {
    expect(classifyTier(fakeParsed('leaf', 20), [err()], 1.0).tier).toBe('C')
  })

  it('C — lines hit warn threshold', () => {
    // leaf warn=50
    expect(classifyTier(fakeParsed('leaf', 50), [], 1.0).tier).toBe('C')
  })

  it('C — gap below 0.5', () => {
    expect(classifyTier(fakeParsed('leaf', 20), [], 0.45).tier).toBe('C')
  })

  it('D — two errors', () => {
    expect(classifyTier(fakeParsed('leaf', 20), [err(), err()], 1.0).tier).toBe('D')
  })

  it('D — lines hit error threshold', () => {
    // leaf error=80
    expect(classifyTier(fakeParsed('leaf', 80), [], 1.0).tier).toBe('D')
  })

  it('D — gap below 0.4', () => {
    expect(classifyTier(fakeParsed('leaf', 20), [], 0.3).tier).toBe('D')
  })

  it('F — four errors', () => {
    expect(classifyTier(fakeParsed('leaf', 20), [err(), err(), err(), err()], 1.0).tier).toBe('F')
  })

  it('F — lines exceed errorAt × 1.5', () => {
    // leaf error=80; 80 * 1.5 = 120
    expect(classifyTier(fakeParsed('leaf', 130), [], 1.0).tier).toBe('F')
  })

  it('counts severities correctly', () => {
    const grade = classifyTier(fakeParsed('mid', 30), [err(), warn(), info(), info()], 0.8)
    expect(grade.errorCount).toBe(1)
    expect(grade.warningCount).toBe(1)
    expect(grade.infoCount).toBe(2)
  })

  it('top scope target band', () => {
    // top targetMax=80, warn=130, error=200
    expect(classifyTier(fakeParsed('top', 80), [], 1.0).tier).toBe('A')
    expect(classifyTier(fakeParsed('top', 100), [], 1.0).tier).toBe('B')
    expect(classifyTier(fakeParsed('top', 130), [], 1.0).tier).toBe('C')
    expect(classifyTier(fakeParsed('top', 200), [], 1.0).tier).toBe('D')
    expect(classifyTier(fakeParsed('top', 301), [], 1.0).tier).toBe('F')
  })
})

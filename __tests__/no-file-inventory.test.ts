import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import noFileInventory from '../src/checks/rules/no-file-inventory.js'
import { parseToMdast } from '../src/parse/parse-claudemd.js'
import { extractTables } from '../src/parse/extract-tables.js'
import { extractSections } from '../src/parse/extract-sections.js'
import type { ParsedClaudeMd } from '../src/types/parsed.js'
import type { CheckContext } from '../src/types/check.js'

const FIXTURES = join(import.meta.dirname, 'fixtures', 'no-file-inventory')

function parseFixture(name: string): ParsedClaudeMd {
  const path = join(FIXTURES, name)
  const raw = readFileSync(path, 'utf-8')
  const tree = parseToMdast(raw)
  return {
    path,
    relPath: name,
    scope: 'leaf',
    siblingCodeFileCount: 0,
    lineCount: raw.split('\n').length,
    raw,
    sections: extractSections(tree),
    tables: extractTables(tree),
    codeBlocks: [],
    gitLastModified: null,
    sourceDir: FIXTURES,
  }
}

const ctx: CheckContext = {
  projectRoot: '/',
  parent: null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tsProject: {} as any,
  eslintRules: new Set(),
  astCheckIds: new Set(),
}

describe('no-file-inventory', () => {
  it('flags an obvious file inventory table', () => {
    const findings = noFileInventory.run(parseFixture('bad.md'), ctx)
    expect(findings.length).toBe(1)
    expect(findings[0].severity).toBe('error')
    expect(findings[0].check).toBe('no-file-inventory')
  })

  it('does not flag a table where descriptions are surprising', () => {
    const findings = noFileInventory.run(parseFixture('good.md'), ctx)
    expect(findings.length).toBe(0)
  })
})

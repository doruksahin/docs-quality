import { dirname, resolve } from 'node:path'
import { existsSync, readdirSync } from 'node:fs'
import { Project } from 'ts-morph'
import {
  discoverAndParse, findMissingDocs, parseClaudeMd,
  loadEslintRules, loadAstCheckIds,
} from '../parse/index.js'
import { discoverRules, runChecks } from '../checks/index.js'
import { classifyTier, computeGenGap } from '../score/index.js'
import { selectFormat } from '../report/index.js'
import type { CheckContext, DocCheck } from '../types/check.js'
import type { ParsedClaudeMd } from '../types/parsed.js'
import type { DocReport, ReportInput } from '../types/reporter.js'
import type { CliOptions } from './parse-args.js'

const MIN_FILES_FOR_MISSING_DOC = 8

/** Find the nearest ancestor CLAUDE.md (excluding the file itself) given a parsed list. */
function findParent(parsed: ParsedClaudeMd, all: readonly ParsedClaudeMd[]): ParsedClaudeMd | null {
  let current = dirname(parsed.path)
  while (true) {
    const next = dirname(current)
    if (next === current) return null
    current = next
    const candidate = all.find((p) => dirname(p.path) === current)
    if (candidate) return candidate
  }
}

interface PipelineResult {
  reports: DocReport[]
  missing: { dir: string; codeFileCount: number }[]
  rendered: string
  counts: { errors: number; warnings: number; tierF: number; tierD: number }
}

export async function runPipeline(codebase: string, opts: CliOptions, rulesDir: string): Promise<PipelineResult> {
  // Layer 1: parse
  const allParsed = opts.pathFilter
    ? [parseClaudeMd(resolve(codebase, opts.pathFilter), codebase)]
    : discoverAndParse(codebase)

  // Cross-cutting context
  const tsConfigPath = pickTsConfig(codebase)
  const tsProject = new Project({
    ...(tsConfigPath ? { tsConfigFilePath: tsConfigPath } : {}),
    skipAddingFilesFromTsConfig: true,
    compilerOptions: { allowJs: true },
  })
  const eslintRules = loadEslintRules(codebase)
  const astCheckIds = loadAstCheckIds(codebase)

  // Layer 2a: rules
  let rules = await discoverRules(rulesDir)
  if (opts.filterCheck) {
    const filtered = rules.filter((r: DocCheck) => r.name === opts.filterCheck)
    if (filtered.length === 0) throw new Error(`No check named "${opts.filterCheck}". Available: ${rules.map((r: DocCheck) => r.name).join(', ')}`)
    rules = filtered
  }

  // For each parsed: build context, run checks, score, classify
  const reports: DocReport[] = []
  for (const parsed of allParsed) {
    const ctx: CheckContext = {
      projectRoot: codebase,
      parent: findParent(parsed, allParsed),
      tsProject,
      eslintRules,
      astCheckIds,
    }
    const findings = runChecks(parsed, rules, ctx)
    const genGap = computeGenGap(parsed, tsProject, codebase)
    const grade = classifyTier(parsed, findings, genGap)
    reports.push({ parsed, findings, grade })
  }

  // Missing-doc directories (skip when filtering)
  const missing = opts.pathFilter ? [] : findMissingDocs(codebase, MIN_FILES_FOR_MISSING_DOC)

  // Layer 3: render
  const reporter = selectFormat(opts.format)
  const input: ReportInput = { reports, missing }
  const rendered = reporter.render(input, { color: opts.color })

  const counts = reports.reduce(
    (acc, r) => {
      acc.errors += r.grade.errorCount
      acc.warnings += r.grade.warningCount
      if (r.grade.tier === 'F') acc.tierF += 1
      if (r.grade.tier === 'D') acc.tierD += 1
      return acc
    },
    { errors: 0, warnings: 0, tierF: 0, tierD: 0 },
  )

  return { reports, missing, rendered, counts }
}

/**
 * Find a usable tsconfig anywhere in the codebase. Tries the root first;
 * falls back to the first tsconfig found in immediate subdirectories
 * (apps/<x>, packages/<x>, etc.). Returns null when none exist —
 * ts-morph still works without one for stub generation.
 */
function pickTsConfig(codebase: string): string | null {
  const rootCandidate = resolve(codebase, 'tsconfig.json')
  if (existsSync(rootCandidate)) return rootCandidate

  for (const sub of ['apps', 'packages']) {
    const subdir = resolve(codebase, sub)
    if (!existsSync(subdir)) continue
    let entries
    try {
      entries = readdirSync(subdir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const path = resolve(subdir, entry.name, 'tsconfig.json')
      if (existsSync(path)) return path
    }
  }

  return null
}

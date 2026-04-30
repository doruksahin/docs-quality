import type { Project } from 'ts-morph'
import type { ParsedClaudeMd } from '../../types/parsed.js'
import { generateStub } from './generate-stub.js'
import { generationGap } from './diff-shingles.js'

export { generateStub } from './generate-stub.js'
export { generationGap, shingles, tokenize } from './diff-shingles.js'

/** Compose: derive a stub from the source directory, return the gap score. */
export function computeGenGap(parsed: ParsedClaudeMd, project: Project, workspaceRoot: string): number {
  const stub = generateStub(parsed, project, workspaceRoot)
  return generationGap(parsed.raw, stub)
}

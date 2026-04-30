import { readdirSync, statSync, existsSync } from 'node:fs'
import { extname, join, basename, relative } from 'node:path'
import type { Project } from 'ts-morph'
import { Node } from 'ts-morph'
import type { ParsedClaudeMd } from '../../types/parsed.js'

/**
 * Generate a deterministic markdown "stub" containing only what could be
 * derived from the directory's code. Used to measure the human-only signal
 * in the actual CLAUDE.md (generation gap = actual minus this).
 */

const CODE_EXT = new Set(['.ts', '.tsx', '.mts', '.js', '.jsx', '.mjs'])
const SKIP_DIR = new Set(['node_modules', '.git', 'dist', 'build', 'out', '__tests__', '.docs-coverage'])

interface FileEntry {
  path: string
  name: string
  symbols: string[]
}

function listSiblingFiles(dir: string): string[] {
  const out: string[] = []
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    if (!entry.isFile()) continue
    if (!CODE_EXT.has(extname(entry.name))) continue
    if (entry.name.includes('.test.') || entry.name.includes('.spec.')) continue
    out.push(join(dir, entry.name))
  }
  return out
}

function listSubdirs(dir: string): string[] {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return []
  }
  return entries
    .filter((e) => e.isDirectory() && !SKIP_DIR.has(e.name) && !e.name.startsWith('.'))
    .map((e) => e.name)
}

function extractTopLevelSymbols(project: Project, filePath: string): string[] {
  const sf = project.addSourceFileAtPathIfExists(filePath) ?? project.addSourceFileAtPath(filePath)
  const names: string[] = []
  for (const stmt of sf.getStatements()) {
    if (Node.isFunctionDeclaration(stmt) || Node.isClassDeclaration(stmt) || Node.isInterfaceDeclaration(stmt) || Node.isTypeAliasDeclaration(stmt)) {
      const name = stmt.getName?.()
      if (name && stmt.isExported?.()) names.push(name)
    } else if (Node.isVariableStatement(stmt)) {
      if (!stmt.isExported()) continue
      for (const decl of stmt.getDeclarations()) {
        names.push(decl.getName())
      }
    }
  }
  return names
}

function collectImportsSummary(project: Project, files: string[]): string[] {
  const seen = new Set<string>()
  for (const f of files) {
    const sf = project.addSourceFileAtPathIfExists(f) ?? project.addSourceFileAtPath(f)
    for (const imp of sf.getImportDeclarations()) {
      const spec = imp.getModuleSpecifierValue()
      if (spec.startsWith('.') || spec.startsWith('node:')) continue
      // Strip subpath imports for grouping
      const root = spec.split('/').slice(0, spec.startsWith('@') ? 2 : 1).join('/')
      seen.add(root)
    }
  }
  return Array.from(seen).sort()
}

/** Generate a markdown stub for the directory containing this CLAUDE.md. */
export function generateStub(parsed: ParsedClaudeMd, project: Project, workspaceRoot: string): string {
  const lines: string[] = []
  const moduleName = basename(parsed.sourceDir)
  const relSource = relative(workspaceRoot, parsed.sourceDir) || '.'

  lines.push(`# ${moduleName}`)
  lines.push('')
  lines.push(`Module at \`${relSource}\`.`)
  lines.push('')

  const files = listSiblingFiles(parsed.sourceDir)
  if (files.length > 0) {
    lines.push('## Files')
    lines.push('')
    const entries: FileEntry[] = files.map((f) => ({
      path: f,
      name: basename(f),
      symbols: extractTopLevelSymbols(project, f),
    }))
    for (const e of entries) {
      const symList = e.symbols.length > 0 ? e.symbols.join(', ') : '(no exports)'
      lines.push(`- \`${e.name}\` — exports: ${symList}`)
    }
    lines.push('')
  }

  const subdirs = listSubdirs(parsed.sourceDir).filter((s) => existsSync(join(parsed.sourceDir, s)) && statSync(join(parsed.sourceDir, s)).isDirectory())
  if (subdirs.length > 0) {
    lines.push('## Subdirectories')
    lines.push('')
    for (const s of subdirs) lines.push(`- \`${s}/\``)
    lines.push('')
  }

  if (files.length > 0) {
    const imports = collectImportsSummary(project, files)
    if (imports.length > 0) {
      lines.push('## Uses')
      lines.push('')
      lines.push(imports.join(', '))
      lines.push('')
    }
  }

  return lines.join('\n')
}

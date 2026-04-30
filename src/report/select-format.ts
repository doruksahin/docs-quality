import type { Reporter } from '../types/reporter.js'
import tableReporter from './formats/table.js'
import jsonReporter from './formats/json.js'

/** Single source of truth for available output formats. Add an entry to extend. */
const REPORTERS: Record<string, Reporter> = {
  table: tableReporter,
  json: jsonReporter,
}

export function selectFormat(name: string): Reporter {
  const r = REPORTERS[name]
  if (!r) throw new Error(`Unknown format: ${name}. Available: ${Object.keys(REPORTERS).join(', ')}`)
  return r
}

export function listFormats(): string[] {
  return Object.keys(REPORTERS)
}

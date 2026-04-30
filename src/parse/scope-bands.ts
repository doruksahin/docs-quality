import type { ScopeKind } from '../types/parsed.js'

export interface ScopeBand {
  readonly targetMin: number
  readonly targetMax: number
  readonly warnAt: number
  readonly errorAt: number
}

const BANDS: Record<ScopeKind, ScopeBand> = {
  leaf: { targetMin: 15, targetMax: 30, warnAt: 50, errorAt: 80 },
  mid: { targetMin: 30, targetMax: 50, warnAt: 80, errorAt: 130 },
  top: { targetMin: 50, targetMax: 80, warnAt: 130, errorAt: 200 },
  root: { targetMin: 100, targetMax: 150, warnAt: 200, errorAt: 300 },
}

export function getBand(scope: ScopeKind): ScopeBand {
  return BANDS[scope]
}

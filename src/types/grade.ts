export type Tier = 'A' | 'B' | 'C' | 'D' | 'F' | 'MISSING'

export interface TierGrade {
  readonly tier: Tier
  readonly genGap: number
  readonly errorCount: number
  readonly warningCount: number
  readonly infoCount: number
}

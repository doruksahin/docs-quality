/** Scope of a CLAUDE.md file — drives line-count targets */
export type ScopeKind = 'leaf' | 'mid' | 'top' | 'root'

/** A heading parsed from mdast with its source-line offset and body text */
export interface MdSection {
  readonly depth: number
  readonly title: string
  readonly bodyText: string
  readonly line: number
}

/** A markdown table with column headers, body rows, and source-line offset */
export interface MdTable {
  readonly afterHeading: string
  readonly columns: readonly string[]
  readonly rows: ReadonlyArray<readonly string[]>
  readonly line: number
}

/** A fenced code block with language tag, normalized value, and source-line offset */
export interface CodeBlock {
  readonly lang: string
  readonly value: string
  readonly line: number
}

/** A CLAUDE.md file fully parsed into structured data — input to all checks and scoring */
export interface ParsedClaudeMd {
  readonly path: string
  readonly relPath: string
  readonly scope: ScopeKind
  readonly siblingCodeFileCount: number
  readonly lineCount: number
  readonly raw: string
  readonly sections: readonly MdSection[]
  readonly tables: readonly MdTable[]
  readonly codeBlocks: readonly CodeBlock[]
  readonly gitLastModified: Date | null
  readonly sourceDir: string
}

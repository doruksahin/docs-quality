import { describe, it, expect } from 'vitest'
import { generationGap, shingles, tokenize } from '../src/score/generation-gap/diff-shingles.js'

describe('tokenize', () => {
  it('lowercases and splits on non-alphanumeric', () => {
    expect(tokenize('Foo Bar-Baz_qux 123')).toEqual(['foo', 'bar-baz_qux', '123'])
  })

  it('returns empty for empty input', () => {
    expect(tokenize('')).toEqual([])
  })
})

describe('shingles', () => {
  it('produces n-shingles of size 3 by default', () => {
    const s = shingles('one two three four five')
    expect(s.has('one two three')).toBe(true)
    expect(s.has('two three four')).toBe(true)
    expect(s.has('three four five')).toBe(true)
    expect(s.size).toBe(3)
  })

  it('returns empty when fewer than n tokens', () => {
    expect(shingles('hi there').size).toBe(0)
  })
})

describe('generationGap', () => {
  it('returns 0 when actual is empty', () => {
    expect(generationGap('', 'anything goes here friends')).toBe(0)
  })

  it('returns 1 when nothing in actual is in derived', () => {
    expect(generationGap('alpha beta gamma delta', 'one two three four five')).toBe(1)
  })

  it('returns 0 when actual is a subset of derived', () => {
    const derived = 'one two three four five six seven'
    const actual = 'one two three four'
    expect(generationGap(actual, derived)).toBe(0)
  })

  it('returns ~0.5 when half the shingles overlap', () => {
    const derived = 'one two three four five'
    // Two shingles: "one two three", "two three four", "three four five"
    // Add a novel sentence to actual; mix results in partial overlap.
    const actual = 'one two three nine ten eleven twelve'
    const gap = generationGap(actual, derived)
    expect(gap).toBeGreaterThan(0.5)
    expect(gap).toBeLessThan(1.0)
  })
})

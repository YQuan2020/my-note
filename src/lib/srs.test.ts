import { describe, it, expect } from 'vitest'
import { sessionQueue, countDue, countNew } from './srs'
import type { Card } from './types'

const DAY = 24 * 60 * 60 * 1000

function baseCard(over: Partial<Card> = {}): Card {
  return {
    id: 'c1',
    deckId: 'd1',
    type: 'basic',
    front: 'apple',
    back: 'apple',
    tags: [],
    state: 'new',
    reps: 0,
    ease: 2.5,
    interval: 0,
    due: 0,
    createdAt: 0,
    ...over,
  }
}

describe('queue 统计', () => {
  it('countDue 只统计到期且非新卡', () => {
    const cards = [
      baseCard({ state: 'new', due: 0 }),
      baseCard({ id: 'c2', state: 'review', due: Date.now() - 1000 }),
      baseCard({ id: 'c3', state: 'review', due: Date.now() + DAY }),
    ]
    expect(countDue(cards)).toBe(1)
    expect(countNew(cards)).toBe(1)
  })

  it('sessionQueue 到期在前、新卡在后且受限', () => {
    const now = Date.now()
    const cards = [
      baseCard({ id: 'due', state: 'review', due: now - 1000 }),
      baseCard({ id: 'n1', state: 'new', due: now }),
      baseCard({ id: 'n2', state: 'new', due: now }),
    ]
    const q = sessionQueue(cards, 1, now)
    expect(q.map((c) => c.id)).toEqual(['due', 'n1'])
  })
})

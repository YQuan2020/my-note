import { describe, it, expect } from 'vitest'
import { schedule } from './srs'
import type { Card } from './types'

const DAY = 24 * 60 * 60 * 1000

function baseCard(over: Partial<Card> = {}): Card {
  return {
    id: 'c1',
    deckId: 'd1',
    type: 'basic',
    front: 'apple',
    back: '苹果',
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

describe('schedule', () => {
  it('新卡 Good → 毕业，1 天间隔', () => {
    const r = schedule(baseCard(), 'good', 0)
    expect(r.state).toBe('review')
    expect(r.interval).toBe(1)
    expect(r.due).toBe(DAY)
    expect(r.reps).toBe(1)
  })

  it('新卡 Easy → 4 天间隔', () => {
    const r = schedule(baseCard(), 'easy', 0)
    expect(r.interval).toBe(4)
    expect(r.ease).toBeCloseTo(2.65)
  })

  it('新卡 Again → 学习，1 分钟后到期', () => {
    const r = schedule(baseCard(), 'again', 0)
    expect(r.state).toBe('learning')
    expect(r.due).toBe(60 * 1000)
    expect(r.reps).toBe(0)
  })

  it('复习卡 Good → 第二次成功为 6 天', () => {
    const review: Card = baseCard({ state: 'review', reps: 1, interval: 1, ease: 2.5 })
    const first = schedule(review, 'good', 0)
    expect(first.interval).toBe(6)
    const second = schedule({ ...review, reps: 2, interval: 6 }, 'good', 0)
    expect(second.interval).toBe(Math.round(6 * 2.5))
  })

  it('Hard 降低 ease 并缩短间隔', () => {
    const review: Card = baseCard({ state: 'review', reps: 3, interval: 10, ease: 2.5 })
    const r = schedule(review, 'hard', 0)
    expect(r.ease).toBeCloseTo(2.35)
    expect(r.interval).toBe(12)
  })

  it('ease 不低过下限 1.3', () => {
    const review: Card = baseCard({ state: 'review', reps: 3, interval: 10, ease: 1.3 })
    const r = schedule(review, 'hard', 0)
    expect(r.ease).toBe(1.3)
  })
})

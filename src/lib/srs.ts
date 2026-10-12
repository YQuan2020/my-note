import type { Card } from './types'

export const NEW_PER_DAY = 20

export const DAY_MS = 24 * 60 * 60 * 1000

/** 是否到期（新卡不算“待复习”） */
export function isDue(card: Card, now = Date.now()): boolean {
  return card.state !== 'new' && card.due <= now
}

/** 待复习数量（学习/复习中且到期） */
export function countDue(cards: Card[], now = Date.now()): number {
  return cards.filter((c) => isDue(c, now)).length
}

/** 学习中且到期（1min/10min 步已到） */
export function countLearning(cards: Card[], now = Date.now()): number {
  return cards.filter((c) => c.state === 'learning' && c.due <= now).length
}

/** 新卡数量 */
export function countNew(cards: Card[]): number {
  return cards.filter((c) => c.state === 'new').length
}

/**
 * 构建一次学习会话的队列：
 * 先放所有到期卡，再放新卡（受每日上限限制）。
 */
export function sessionQueue(
  cards: Card[],
  newPerDay = NEW_PER_DAY,
  now = Date.now(),
): Card[] {
  const due = cards.filter((c) => isDue(c, now))
  const fresh = cards.filter((c) => c.state === 'new').slice(0, newPerDay)
  return [...due, ...fresh]
}

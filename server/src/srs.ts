import type { Card, Rating } from './types'

export const INITIAL_EASE = 2.5
export const MIN_EASE = 1.3

const DAY_MS = 24 * 60 * 60 * 1000
const MIN_MS = 60 * 1000

/**
 * Anki-style SM-2 spaced repetition scheduling.
 * Pure function: returns an updated card without mutating the input.
 */
export function schedule(card: Card, rating: Rating, now = Date.now()): Card {
  const c: Card = { ...card }
  c.ease = c.ease || INITIAL_EASE

  if (rating === 'again') {
    c.state = c.reps > 0 ? 'relearning' : 'learning'
    c.reps = 0
    c.ease = Math.max(MIN_EASE, c.ease - 0.2)
    c.interval = 0
    c.due = now + MIN_MS
    c.lastReviewed = now
    return c
  }

  const isLearning =
    c.state === 'new' || c.state === 'learning' || c.state === 'relearning'

  if (isLearning) {
    c.reps += 1
    c.lastReviewed = now
    if (rating === 'hard') {
      c.state = 'learning'
      c.interval = 0
      c.ease = Math.max(MIN_EASE, c.ease - 0.15)
      c.due = now + 10 * MIN_MS
      return c
    }
    c.state = 'review'
    c.interval = rating === 'easy' ? 4 : 1
    if (rating === 'easy') c.ease = Math.max(MIN_EASE, c.ease + 0.15)
    c.due = now + c.interval * DAY_MS
    return c
  }

  c.reps += 1
  c.lastReviewed = now
  if (rating === 'hard') {
    c.ease = Math.max(MIN_EASE, c.ease - 0.15)
    c.interval = Math.max(1, Math.round(c.interval * 1.2))
  } else if (rating === 'easy') {
    c.ease = Math.max(MIN_EASE, c.ease + 0.15)
    c.interval = Math.max(1, Math.round(c.interval * c.ease * 1.3))
  } else {
    c.interval =
      c.reps === 2 ? 6 : Math.max(1, Math.round(c.interval * c.ease))
  }
  c.state = 'review'
  c.due = now + c.interval * DAY_MS
  return c
}

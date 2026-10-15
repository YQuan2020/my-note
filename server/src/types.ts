export type CardType = 'basic' | 'cloze' | 'audio'
export type CardState = 'new' | 'learning' | 'review' | 'relearning'
export type Rating = 'again' | 'hard' | 'good' | 'easy'

export interface Deck {
  id: string
  name: string
  description?: string
  createdAt: number
}

export interface Card {
  id: string
  deckId: string
  type: CardType
  front: string
  back: string
  text?: string
  audioData?: string
  ttsLang?: string
  frontImage?: string
  backImage?: string
  tags: string[]
  state: CardState
  reps: number
  ease: number
  interval: number
  due: number
  createdAt: number
  lastReviewed?: number
}

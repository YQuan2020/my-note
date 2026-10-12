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
  /** 正面：单词/句子/音频卡显示的文本 */
  front: string
  /** 背面：释义/翻译 */
  back: string
  /** cloze 用：带 {{c1::答案}} 标记的原文 */
  text?: string
  /** audio 卡：base64 data URL（可选，缺省用 TTS） */
  audioData?: string
  /** TTS 语言，默认 en-US */
  ttsLang?: string
  tags: string[]
  // SRS 状态
  state: CardState
  reps: number
  ease: number
  interval: number
  due: number
  createdAt: number
  lastReviewed?: number
}

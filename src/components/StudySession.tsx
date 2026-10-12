import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useStore } from '../store'
import { sessionQueue } from '../lib/srs'
import { renderClozeFront, renderClozeBack } from '../lib/split'
import { useTts } from '../hooks/useTts'
import type { Card, Rating } from '../lib/types'

const RATINGS: { key: Rating; label: string; hint: string }[] = [
  { key: 'again', label: 'Again', hint: '1' },
  { key: 'hard', label: 'Hard', hint: '2' },
  { key: 'good', label: 'Good', hint: '3' },
  { key: 'easy', label: 'Easy', hint: '4' },
]

function CardFace({ card, revealed }: { card: Card; revealed: boolean }) {
  const { speak } = useTts()

  if (card.type === 'cloze') {
    const text = card.text || card.front
    return (
      <div className="face">
        <div className="card-kind">Cloze</div>
        <div className="face-text">{revealed ? renderClozeBack(text) : renderClozeFront(text)}</div>
        {revealed && card.back && <div className="face-back">{card.back}</div>}
      </div>
    )
  }

  if (card.type === 'audio') {
    return (
      <div className="face">
        <div className="card-kind">Audio</div>
        <div className="face-text">{revealed ? card.back : card.front}</div>
        {!revealed && (
          <button
            className="btn btn-play"
            onClick={(e) => {
              e.stopPropagation()
              speak(card.front, card.ttsLang || 'en-US')
            }}
          >
            🔊 Play audio
          </button>
        )}
        {!revealed && card.audioData && (
          <audio controls src={card.audioData} className="audio-player" />
        )}
        {revealed && <div className="face-front-ref">{card.front}</div>}
      </div>
    )
  }

  return (
    <div className="face">
      <div className="card-kind">Basic</div>
      <div className="face-text">{revealed ? card.back : card.front}</div>
      {revealed && card.back && <div className="face-back">{card.front}</div>}
    </div>
  )
}

export default function StudySession() {
  const { deckId } = useParams<{ deckId: string }>()
  const cards = useStore((s) => s.cards)
  const decks = useStore((s) => s.decks)
  const reviewCard = useStore((s) => s.reviewCard)

  const deck = decks.find((d) => d.id === deckId)

  const [queue, setQueue] = useState<string[]>(() => {
    const deckCards = cards.filter((c) => c.deckId === deckId)
    return sessionQueue(deckCards).map((c) => c.id)
  })
  const [total] = useState(queue.length)
  const [revealed, setRevealed] = useState(false)

  const current = useMemo(
    () => cards.find((c) => c.id === queue[0]) ?? null,
    [cards, queue],
  )

  const answer = (rating: Rating) => {
    const id = queue[0]
    if (!id) return
    reviewCard(id, rating).catch(console.error)
    setRevealed(false)
    setQueue((q) => (rating === 'again' ? [...q.slice(1), id] : q.slice(1)))
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!current) return
      if (e.code === 'Space') {
        e.preventDefault()
        setRevealed((r) => !r)
      } else if (revealed && ['1', '2', '3', '4'].includes(e.key)) {
        const idx = Number(e.key) - 1
        answer(RATINGS[idx].key)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!deck) return <div className="page">Deck not found</div>

  if (!current) {
    const done = total - queue.length
    return (
      <div className="page study-done">
        <h1>🎉 Session complete</h1>
        <p>Reviewed {done} cards. Remaining new cards continue tomorrow.</p>
        <div className="row">
          <Link className="btn btn-primary" to="/">
            Back to decks
          </Link>
          <Link className="btn" to={`/deck/${deckId}`}>
            Browse cards
          </Link>
        </div>
      </div>
    )
  }

  const done = total - queue.length
  const progress = total > 0 ? Math.round((done / total) * 100) : 100

  return (
    <div className="page study">
      <div className="study-head">
        <Link to={`/deck/${deckId}`} className="back-link">
          ← {deck.name}
        </Link>
        <span className="remain">{queue.length} remaining</span>
      </div>
      <div className="progress">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div
        className={`flashcard ${revealed ? 'revealed' : ''}`}
        onClick={() => setRevealed((r) => !r)}
      >
        <CardFace card={current} revealed={revealed} />
        <div className="flip-hint">{revealed ? 'Answer shown' : 'Click the card or press Space to reveal'}</div>
      </div>

      <div className="ratings">
        {revealed ? (
          RATINGS.map((r) => (
            <button
              key={r.key}
              className={`btn btn-rating rating-${r.key}`}
              onClick={() => answer(r.key)}
            >
              <span className="rating-label">{r.label}</span>
              <span className="rating-hint">{r.hint}</span>
            </button>
          ))
        ) : (
          <button className="btn btn-primary btn-reveal" onClick={() => setRevealed(true)}>
            Show answer (Space)
          </button>
        )}
      </div>
    </div>
  )
}

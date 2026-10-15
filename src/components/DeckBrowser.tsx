import { useMemo, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { renderClozeFront } from '../lib/split'
import type { Card } from '../lib/types'

const STATE_LABEL: Record<Card['state'], string> = {
  new: 'New',
  learning: 'Learning',
  review: 'Review',
  relearning: 'Relearning',
}

function preview(card: Card): string {
  if (card.type === 'cloze') return renderClozeFront(card.text || card.front)
  if (card.type === 'audio') return `🔊 ${card.front}`
  return card.front
}

export default function DeckBrowser() {
  const { deckId } = useParams<{ deckId: string }>()
  const decks = useStore((s) => s.decks)
  const cards = useStore((s) => s.cards)
  const deleteCard = useStore((s) => s.deleteCard)
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [tag, setTag] = useState('')

  const deck = decks.find((d) => d.id === deckId)
  const deckCards = cards.filter((c) => c.deckId === deckId)

  const tags = useMemo(() => {
    const t = new Set<string>()
    deckCards.forEach((c) => c.tags.forEach((x) => t.add(x)))
    return [...t]
  }, [deckCards])

  const filtered = deckCards.filter((c) => {
    const matchQ =
      !q.trim() ||
      c.front.toLowerCase().includes(q.toLowerCase()) ||
      c.back.toLowerCase().includes(q.toLowerCase()) ||
      (c.text || '').toLowerCase().includes(q.toLowerCase())
    const matchTag = !tag || c.tags.includes(tag)
    return matchQ && matchTag
  })

  if (!deck) return <div className="page">Deck not found</div>

  return (
    <div className="page">
      <div className="page-head">
        <Link to="/" className="back-link">
          ← Decks
        </Link>
        <h1>{deck.name}</h1>
        <div className="row">
          <Link className="btn btn-primary" to={`/deck/${deckId}/card`}>
            + Add Card
          </Link>
          <Link className="btn" to={`/deck/${deckId}/import`}>
            Bulk Import
          </Link>
          <button className="btn" onClick={() => navigate(`/study/${deckId}`)}>
            Start Studying
          </button>
        </div>
      </div>

      <div className="toolbar">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search cards…"
        />
        <select value={tag} onChange={(e) => setTag(e.target.value)}>
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="card-list">
        {filtered.length === 0 ? (
          <div className="empty">
            <p>No cards yet. Click "Add Card" or "Bulk Import" to get started.</p>
          </div>
        ) : (
          filtered.map((c) => (
            <div className="card-row" key={c.id}>
              <div className="card-row-main">
                {c.frontImage && (
                  <img src={c.frontImage} className="card-row-img" alt="" />
                )}
                <div className="card-row-text">
                  <div className="card-row-front">{preview(c)}</div>
                  <div className="card-row-back">{c.back || renderClozeFront(c.text || '')}</div>
                </div>
              </div>
              <div className="card-row-meta">
                <span className="badge">{c.type === 'cloze' ? 'cloze' : c.type}</span>
                <span className={`badge state-${c.state}`}>{STATE_LABEL[c.state]}</span>
                {c.tags.map((t) => (
                  <span className="badge tag" key={t}>
                    {t}
                  </span>
                ))}
              </div>
              <div className="card-row-actions">
                <button className="btn btn-sm" onClick={() => navigate(`/deck/${deckId}/card/${c.id}`)}>
                  Edit
                </button>
                <button
                  className="btn btn-sm btn-ghost danger"
                  onClick={() => {
                    if (confirm('Delete this card?')) deleteCard(c.id)
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

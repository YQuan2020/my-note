import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { countNew, countDue, countLearning } from '../lib/srs'

export default function DeckList() {
  const decks = useStore((s) => s.decks)
  const cards = useStore((s) => s.cards)
  const addDeck = useStore((s) => s.addDeck)
  const deleteDeck = useStore((s) => s.deleteDeck)
  const navigate = useNavigate()
  const [name, setName] = useState('')

  const createDeck = async (e: React.FormEvent) => {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    await addDeck(n)
    setName('')
  }

  return (
    <div className="deck-list">
      <div className="page-head">
        <h1>My Decks</h1>
        <p className="subtitle">Review your English articles, novels, and movies with spaced repetition</p>
      </div>

      <form className="add-deck" onSubmit={createDeck}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New deck, e.g.: English Novels · Movie Quotes · Vocabulary"
        />
        <button className="btn btn-primary" type="submit">
          New Deck
        </button>
      </form>

      {decks.length === 0 ? (
        <div className="empty">
          <p>No decks yet. Create one, then paste an article via "Bulk Import" to generate cards quickly, or add cards manually.</p>
        </div>
      ) : (
        <div className="deck-grid">
          {decks.map((deck) => {
            const deckCards = cards.filter((c) => c.deckId === deck.id)
            const due = countDue(deckCards)
            const learning = countLearning(deckCards)
            const fresh = countNew(deckCards)
            const total = deckCards.length
            return (
              <div className="deck-card" key={deck.id}>
                <div className="deck-card-top">
                  <h2>{deck.name}</h2>
                  <span className="deck-total">{total} cards</span>
                </div>
                {deck.description && <p className="deck-desc">{deck.description}</p>}
                <div className="deck-stats">
                  <span className="stat new">New {fresh}</span>
                  <span className="stat learning">Learning {learning}</span>
                  <span className="stat due">Due {due}</span>
                </div>
                <div className="deck-actions">
                  <button
                    className="btn btn-primary"
                    onClick={() => navigate(`/study/${deck.id}`)}
                    disabled={due + fresh === 0}
                  >
                    Study {due + fresh > 0 ? `(${due + fresh})` : ''}
                  </button>
                  <button className="btn" onClick={() => navigate(`/deck/${deck.id}`)}>
                    Browse
                  </button>
                  <button
                    className="btn btn-ghost danger"
                    onClick={() => {
                      if (confirm(`Delete deck "${deck.name}" and all its cards?`)) deleteDeck(deck.id)
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useStore } from '../store'
import { splitText, type SplitMode, type SplitResult } from '../lib/split'
import type { CardType } from '../lib/types'

const MODES: { value: SplitMode; label: string; desc: string; type: CardType }[] = [
  { value: 'sentence-basic', label: 'By sentence → front/back', desc: 'One card per sentence; English front, blank back for translation', type: 'basic' },
  { value: 'sentence-cloze', label: 'By sentence → cloze', desc: 'Cloze out one content word per sentence', type: 'cloze' },
  { value: 'word-basic', label: 'By word → front/back', desc: 'Extract unique words, filter common words', type: 'basic' },
]

export default function ImportView() {
  const { deckId } = useParams<{ deckId: string }>()
  const decks = useStore((s) => s.decks)
  const importCards = useStore((s) => s.importCards)
  const navigate = useNavigate()

  const deck = decks.find((d) => d.id === deckId)
  const [source, setSource] = useState('')
  const [mode, setMode] = useState<SplitMode>('sentence-basic')
  const [drafts, setDrafts] = useState<SplitResult[]>([])

  if (!deck) return <div className="page">Deck not found</div>

  const currentMode = MODES.find((m) => m.value === mode)!

  const preview = () => {
    setDrafts(splitText(source, mode))
  }

  const updateDraft = (i: number, patch: Partial<SplitResult>) => {
    setDrafts((ds) => ds.map((d, idx) => (idx === i ? { ...d, ...patch } : d)))
  }

  const confirm = async () => {
    const n = await importCards(
      deckId!,
      drafts
        .filter((d) => (currentMode.type === 'cloze' ? d.text : d.front))
        .map((d) => ({ ...d, type: currentMode.type })),
    )
    alert(`Imported ${n} cards`)
    navigate(`/deck/${deckId}`)
  }

  return (
    <div className="page">
      <div className="page-head">
        <Link to={`/deck/${deckId}`} className="back-link">
          ← {deck.name}
        </Link>
        <h1>Bulk Import</h1>
        <p className="subtitle">Paste an English article to split it into cards automatically</p>
      </div>

      <div className="import-pane">
        <textarea
          className="source-input"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          rows={8}
          placeholder={'Paste English text, e.g.:\n\nThe quick brown fox jumps over the lazy dog. It is a beautiful day outside.'}
        />

        <div className="type-picker">
          {MODES.map((m) => (
            <button
              type="button"
              key={m.value}
              className={`type-chip ${mode === m.value ? 'selected' : ''}`}
              onClick={() => setMode(m.value)}
            >
              {m.label}
              <small>{m.desc}</small>
            </button>
          ))}
        </div>

        <button className="btn btn-primary" onClick={preview} disabled={!source.trim()}>
          Preview split
        </button>
      </div>

      {drafts.length > 0 && (
        <div className="preview">
          <div className="preview-head">
            <span>{drafts.length} cards — edit each one before importing</span>
            <button className="btn btn-primary" onClick={confirm}>
              Import {drafts.length} cards
            </button>
          </div>

          {currentMode.type === 'cloze' ? (
            <div className="preview-list">
              {drafts.map((d, i) => (
                <div className="preview-row" key={i}>
                  <textarea
                    value={d.text}
                    onChange={(e) => updateDraft(i, { text: e.target.value })}
                    rows={1}
                  />
                  <textarea
                    value={d.back}
                    onChange={(e) => updateDraft(i, { back: e.target.value })}
                    rows={1}
                    placeholder="Extra note (optional)"
                  />
                  <button
                    className="btn btn-sm btn-ghost danger"
                    onClick={() => setDrafts((ds) => ds.filter((_, idx) => idx !== i))}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="preview-list">
              {drafts.map((d, i) => (
                <div className="preview-row" key={i}>
                  <textarea
                    value={d.front}
                    onChange={(e) => updateDraft(i, { front: e.target.value })}
                    rows={1}
                  />
                  <textarea
                    value={d.back}
                    onChange={(e) => updateDraft(i, { back: e.target.value })}
                    rows={1}
                    placeholder="Translation / meaning (can fill in later)"
                  />
                  <button
                    className="btn btn-sm btn-ghost danger"
                    onClick={() => setDrafts((ds) => ds.filter((_, idx) => idx !== i))}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

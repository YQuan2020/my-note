import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useStore } from '../store'
import { compressImage, uploadImage } from '../lib/image'
import type { CardType } from '../lib/types'

const TYPES: { value: CardType; label: string }[] = [
  { value: 'basic', label: 'Basic (front/back)' },
  { value: 'cloze', label: 'Cloze' },
  { value: 'audio', label: 'Audio' },
]

function ImageField({
  label,
  value,
  onChange,
  onPick,
}: {
  label: string
  value: string
  onChange: (url: string) => void
  onPick: (file: File) => void
}) {
  return (
    <div className="field">
      <span>{label}</span>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onPick(f)
          e.target.value = ''
        }}
      />
      {value ? (
        <div className="image-preview">
          <img src={value} alt={label} />
          <button type="button" className="btn btn-sm" onClick={() => onChange('')}>
            Remove
          </button>
        </div>
      ) : (
        <small className="hint">Optional. Resized & compressed before upload.</small>
      )}
    </div>
  )
}

export default function CardEditor() {
  const { deckId, cardId } = useParams<{ deckId: string; cardId?: string }>()
  const decks = useStore((s) => s.decks)
  const existing = useStore((s) => s.cards.find((c) => c.id === cardId))
  const addCard = useStore((s) => s.addCard)
  const updateCard = useStore((s) => s.updateCard)
  const navigate = useNavigate()

  const deck = decks.find((d) => d.id === deckId)

  const [type, setType] = useState<CardType>(existing?.type ?? 'basic')
  const [front, setFront] = useState(existing?.front ?? '')
  const [back, setBack] = useState(existing?.back ?? '')
  const [text, setText] = useState(existing?.text ?? '')
  const [tags, setTags] = useState((existing?.tags ?? []).join(', '))
  const [audioData, setAudioData] = useState(existing?.audioData ?? '')
  const [ttsLang, setTtsLang] = useState(existing?.ttsLang ?? 'en-US')
  const [frontImage, setFrontImage] = useState(existing?.frontImage ?? '')
  const [backImage, setBackImage] = useState(existing?.backImage ?? '')

  if (!deck) return <div className="page">Deck not found</div>

  const onFile = (f: File) => {
    const reader = new FileReader()
    reader.onload = () => setAudioData(String(reader.result))
    reader.readAsDataURL(f)
  }

  const onImage = async (f: File, side: 'front' | 'back') => {
    try {
      const url = await uploadImage(await compressImage(f))
      if (side === 'front') setFrontImage(url)
      else setBackImage(url)
    } catch (e) {
      alert(String(e))
    }
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    const tagList = tags
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean)
    const data = {
      front,
      back,
      tags: tagList,
      frontImage: frontImage || undefined,
      backImage: backImage || undefined,
      ...(type === 'cloze' ? { text } : {}),
      ...(type === 'audio' ? { audioData: audioData || undefined, ttsLang } : {}),
    }
    if (cardId) {
      await updateCard(cardId, data)
    } else {
      await addCard(deckId!, type, data)
    }
    navigate(`/deck/${deckId}`)
  }

  return (
    <div className="page editor">
      <Link to={`/deck/${deckId}`} className="back-link">
        ← {deck.name}
      </Link>
      <h1>{cardId ? 'Edit Card' : 'New Card'}</h1>

      <form onSubmit={save} className="editor-form">
        {!cardId && (
          <label className="field">
            <span>Card type</span>
            <div className="type-picker">
              {TYPES.map((t) => (
                <button
                  type="button"
                  key={t.value}
                  className={`type-chip ${type === t.value ? 'selected' : ''}`}
                  onClick={() => setType(t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </label>
        )}

        {type === 'basic' && (
          <>
            <label className="field">
              <span>Front (English word / sentence)</span>
              <textarea value={front} onChange={(e) => setFront(e.target.value)} rows={3} />
            </label>
            <label className="field">
              <span>Back (meaning / translation)</span>
              <textarea value={back} onChange={(e) => setBack(e.target.value)} rows={3} />
            </label>
          </>
        )}

        {type === 'cloze' && (
          <>
            <label className="field">
              <span>Original text with cloze (use {'{{c1::answer}}'} markers)</span>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                placeholder="The {{c1::quick}} brown fox jumps over the lazy dog."
              />
            </label>
            <label className="field">
              <span>Extra note (optional)</span>
              <textarea value={back} onChange={(e) => setBack(e.target.value)} rows={2} />
            </label>
          </>
        )}

        {type === 'audio' && (
          <>
            <label className="field">
              <span>Front (content to recall by sound)</span>
              <textarea value={front} onChange={(e) => setFront(e.target.value)} rows={2} />
            </label>
            <label className="field">
              <span>Back (meaning / translation)</span>
              <textarea value={back} onChange={(e) => setBack(e.target.value)} rows={2} />
            </label>
            <label className="field">
              <span>Audio file (optional; leave empty to use browser TTS)</span>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) onFile(f)
                }}
              />
              {audioData && <audio controls src={audioData} className="audio-player" />}
              <small className="hint">Audio is stored as base64 in the browser; short clips (under 1MB) are recommended.</small>
            </label>
            <label className="field">
              <span>TTS language</span>
              <input value={ttsLang} onChange={(e) => setTtsLang(e.target.value)} />
            </label>
          </>
        )}

        <ImageField
          label="Front image (optional)"
          value={frontImage}
          onChange={setFrontImage}
          onPick={(f) => void onImage(f, 'front')}
        />
        <ImageField
          label="Back image (optional)"
          value={backImage}
          onChange={setBackImage}
          onPick={(f) => void onImage(f, 'back')}
        />

        <label className="field">
          <span>Tags (comma-separated, optional)</span>
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="novel, movie, vocabulary" />
        </label>

        <div className="row">
          <button className="btn btn-primary" type="submit">
            Save
          </button>
          <Link className="btn" to={`/deck/${deckId}`}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

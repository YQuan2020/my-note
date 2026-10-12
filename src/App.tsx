import { useEffect, useRef } from 'react'
import { Routes, Route, Link, NavLink } from 'react-router-dom'
import { useStore } from './store'
import DeckList from './components/DeckList'
import StudySession from './components/StudySession'
import DeckBrowser from './components/DeckBrowser'
import CardEditor from './components/CardEditor'
import ImportView from './components/ImportView'
import StatsView from './components/StatsView'

function BackupControls() {
  const importState = useStore((s) => s.importState)
  const fileRef = useRef<HTMLInputElement>(null)

  const exportJson = () => {
    const { decks, cards } = useStore.getState()
    const blob = new Blob([JSON.stringify({ decks, cards }, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `my-note-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importJson = (file: File) => {
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const data = JSON.parse(String(reader.result))
        if (Array.isArray(data.decks) && Array.isArray(data.cards)) {
          const res = await importState(data.decks, data.cards)
          alert(`Imported ${res.decks.length} deck(s), ${res.cards.length} card(s)`)
        } else {
          alert('Invalid file format')
        }
      } catch {
        alert('Failed to parse: not a valid backup file')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="backup">
      <button className="btn btn-ghost" onClick={exportJson}>
        Export
      </button>
      <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
        Import
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) importJson(f)
          e.target.value = ''
        }}
      />
    </div>
  )
}

export default function App() {
  const load = useStore((s) => s.load)
  const loading = useStore((s) => s.loading)
  const loaded = useStore((s) => s.loaded)
  const error = useStore((s) => s.error)

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="logo">
          <span className="logo-mark">🧠</span> MyAnki
        </Link>
        <nav className="nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            Decks
          </NavLink>
          <NavLink to="/stats" className={({ isActive }) => (isActive ? 'active' : '')}>
            Stats
          </NavLink>
        </nav>
        <BackupControls />
      </header>
      <main className="main">
        {error && (
          <div className="error-banner">
            Failed to connect to the server: {error}
            <button className="btn btn-sm" onClick={() => load()}>
              Retry
            </button>
          </div>
        )}
        {!loaded && loading && <div className="loading">Loading…</div>}
        <Routes>
          <Route path="/" element={<DeckList />} />
          <Route path="/study/:deckId" element={<StudySession />} />
          <Route path="/deck/:deckId" element={<DeckBrowser />} />
          <Route path="/deck/:deckId/card/:cardId?" element={<CardEditor />} />
          <Route path="/deck/:deckId/import" element={<ImportView />} />
          <Route path="/stats" element={<StatsView />} />
        </Routes>
      </main>
    </div>
  )
}

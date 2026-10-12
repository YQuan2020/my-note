import { create } from 'zustand'
import type { Card, CardType, Deck, Rating } from './lib/types'

interface State {
  decks: Deck[]
  cards: Card[]
  loading: boolean
  loaded: boolean
  error: string | null
  load: () => Promise<void>
  addDeck: (name: string, description?: string) => Promise<Deck>
  updateDeck: (id: string, patch: Partial<Deck>) => Promise<void>
  deleteDeck: (id: string) => Promise<void>
  addCard: (deckId: string, type: CardType, data: Partial<Card>) => Promise<Card>
  updateCard: (id: string, patch: Partial<Card>) => Promise<void>
  deleteCard: (id: string) => Promise<void>
  reviewCard: (id: string, rating: Rating) => Promise<void>
  importCards: (deckId: string, drafts: Partial<Card>[]) => Promise<number>
  importState: (decks: Deck[], cards: Card[]) => Promise<{ decks: Deck[]; cards: Card[] }>
}

async function http<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<T>
}

export const useStore = create<State>()((set) => ({
  decks: [],
  cards: [],
  loading: false,
  loaded: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null })
    try {
      const data = await http<{ decks: Deck[]; cards: Card[] }>('/api/state')
      set({ decks: data.decks, cards: data.cards, loading: false, loaded: true })
    } catch (e) {
      set({ loading: false, error: String(e) })
    }
  },

  addDeck: async (name, description) => {
    const deck = await http<Deck>('/api/decks', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    })
    set((s) => ({ decks: [...s.decks, deck] }))
    return deck
  },

  updateDeck: async (id, patch) => {
    const deck = await http<Deck>(`/api/decks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    })
    set((s) => ({ decks: s.decks.map((d) => (d.id === id ? deck : d)) }))
  },

  deleteDeck: async (id) => {
    await http(`/api/decks/${id}`, { method: 'DELETE' })
    set((s) => ({
      decks: s.decks.filter((d) => d.id !== id),
      cards: s.cards.filter((c) => c.deckId !== id),
    }))
  },

  addCard: async (deckId, type, data) => {
    const card = await http<Card>('/api/cards', {
      method: 'POST',
      body: JSON.stringify({ deckId, type, ...data }),
    })
    set((s) => ({ cards: [...s.cards, card] }))
    return card
  },

  updateCard: async (id, patch) => {
    const card = await http<Card>(`/api/cards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    })
    set((s) => ({ cards: s.cards.map((c) => (c.id === id ? card : c)) }))
  },

  deleteCard: async (id) => {
    await http(`/api/cards/${id}`, { method: 'DELETE' })
    set((s) => ({ cards: s.cards.filter((c) => c.id !== id) }))
  },

  reviewCard: async (id, rating) => {
    const card = await http<Card>(`/api/cards/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ rating }),
    })
    set((s) => ({ cards: s.cards.map((c) => (c.id === id ? card : c)) }))
  },

  importCards: async (deckId, drafts) => {
    const data = await http<{ cards: Card[]; count: number }>('/api/import', {
      method: 'POST',
      body: JSON.stringify({ deckId, cards: drafts }),
    })
    set((s) => ({ cards: [...s.cards, ...data.cards] }))
    return data.count
  },

  importState: async (decks, cards) => {
    const data = await http<{ decks: Deck[]; cards: Card[] }>('/api/state', {
      method: 'POST',
      body: JSON.stringify({ decks, cards }),
    })
    set((s) => ({
      decks: [...s.decks, ...data.decks],
      cards: [...s.cards, ...data.cards],
    }))
    return data
  },
}))

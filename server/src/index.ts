import express from 'express'
import type { NextFunction, Request, Response } from 'express'
import {
  pool,
  initSchema,
  uid,
  rowToDeck,
  rowToCard,
  CARD_INSERT_SQL,
  cardInsertParams,
} from './db'
import { schedule, INITIAL_EASE } from './srs'
import type { Card, Deck, Rating } from './types'

const app = express()
// Large limit to accommodate base64 audio uploads.
app.use(express.json({ limit: '50mb' }))

const PORT = Number(process.env.PORT || 3000)

const ah =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next)

function newCard(deckId: string, data: Partial<Card>): Card {
  const now = Date.now()
  return {
    id: uid(),
    deckId,
    type: data.type ?? 'basic',
    front: data.front ?? '',
    back: data.back ?? '',
    text: data.text ?? undefined,
    audioData: data.audioData ?? undefined,
    ttsLang: data.ttsLang ?? undefined,
    tags: data.tags ?? [],
    state: 'new',
    reps: 0,
    ease: INITIAL_EASE,
    interval: 0,
    due: now,
    createdAt: now,
  }
}

async function main() {
  await initSchema()

  app.get('/api/health', (_req, res) => res.json({ ok: true }))

  // Load everything (used by the frontend bootstrap).
  app.get(
    '/api/state',
    ah(async (_req, res) => {
      const decks = await pool.query('SELECT * FROM decks ORDER BY created_at')
      const cards = await pool.query('SELECT * FROM cards ORDER BY created_at')
      res.json({
        decks: decks.rows.map(rowToDeck),
        cards: cards.rows.map(rowToCard),
      })
    }),
  )

  // Import decks + cards (merge into existing data, remap ids to avoid clashes).
  app.post(
    '/api/state',
    ah(async (req, res) => {
      const { decks, cards } = req.body as { decks: Deck[]; cards: Card[] }
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const deckIdMap = new Map<string, string>()
        const newDecks: Deck[] = []
        for (const d of decks) {
          const id = uid()
          deckIdMap.set(d.id, id)
          const nd: Deck = { ...d, id, createdAt: d.createdAt ?? Date.now() }
          newDecks.push(nd)
          await client.query(
            'INSERT INTO decks (id, name, description, created_at) VALUES ($1,$2,$3,$4)',
            [nd.id, nd.name, nd.description ?? null, nd.createdAt],
          )
        }
        const newCards: Card[] = []
        for (const c of cards) {
          const card: Card = {
            ...c,
            id: uid(),
            deckId: deckIdMap.get(c.deckId) ?? c.deckId,
            type: c.type ?? 'basic',
            front: c.front ?? '',
            back: c.back ?? '',
            tags: c.tags ?? [],
            state: c.state ?? 'new',
            reps: c.reps ?? 0,
            ease: c.ease ?? INITIAL_EASE,
            interval: c.interval ?? 0,
            due: c.due ?? Date.now(),
            createdAt: c.createdAt ?? Date.now(),
          }
          newCards.push(card)
          await client.query(CARD_INSERT_SQL, cardInsertParams(card))
        }
        await client.query('COMMIT')
        res.json({ decks: newDecks, cards: newCards })
      } catch (e) {
        await client.query('ROLLBACK')
        throw e
      } finally {
        client.release()
      }
    }),
  )

  app.post(
    '/api/decks',
    ah(async (req, res) => {
      const { name, description } = req.body as {
        name: string
        description?: string
      }
      const deck = { id: uid(), name, description, createdAt: Date.now() }
      await pool.query(
        'INSERT INTO decks (id, name, description, created_at) VALUES ($1,$2,$3,$4)',
        [deck.id, deck.name, deck.description ?? null, deck.createdAt],
      )
      res.json(deck)
    }),
  )

  app.put(
    '/api/decks/:id',
    ah(async (req, res) => {
      const { name, description } = req.body as {
        name?: string
        description?: string
      }
      await pool.query(
        'UPDATE decks SET name=$1, description=$2 WHERE id=$3',
        [name ?? '', description ?? null, req.params.id],
      )
      const r = await pool.query('SELECT * FROM decks WHERE id=$1', [
        req.params.id,
      ])
      res.json(rowToDeck(r.rows[0]))
    }),
  )

  app.delete(
    '/api/decks/:id',
    ah(async (req, res) => {
      await pool.query('DELETE FROM decks WHERE id=$1', [req.params.id])
      res.json({ ok: true })
    }),
  )

  app.post(
    '/api/cards',
    ah(async (req, res) => {
      const { deckId, ...rest } = req.body as Partial<Card> & {
        deckId: string
      }
      const card = newCard(deckId, rest)
      await pool.query(CARD_INSERT_SQL, cardInsertParams(card))
      res.json(card)
    }),
  )

  app.put(
    '/api/cards/:id',
    ah(async (req, res) => {
      const { front, back, text, audioData, ttsLang, tags } = req.body as {
        front?: string
        back?: string
        text?: string
        audioData?: string
        ttsLang?: string
        tags?: string[]
      }
      await pool.query(
        `UPDATE cards
           SET front=$1, back=$2, text=$3, audio_data=$4, tts_lang=$5, tags=$6
         WHERE id=$7`,
        [
          front ?? '',
          back ?? '',
          text ?? null,
          audioData ?? null,
          ttsLang ?? null,
          tags ?? [],
          req.params.id,
        ],
      )
      const r = await pool.query('SELECT * FROM cards WHERE id=$1', [
        req.params.id,
      ])
      res.json(rowToCard(r.rows[0]))
    }),
  )

  app.delete(
    '/api/cards/:id',
    ah(async (req, res) => {
      await pool.query('DELETE FROM cards WHERE id=$1', [req.params.id])
      res.json({ ok: true })
    }),
  )

  app.post(
    '/api/cards/:id/review',
    ah(async (req, res) => {
      const { rating } = req.body as { rating: Rating }
      const r = await pool.query('SELECT * FROM cards WHERE id=$1', [
        req.params.id,
      ])
      if (!r.rows[0]) return res.status(404).json({ error: 'not found' })
      const updated = schedule(rowToCard(r.rows[0]), rating)
      await pool.query(
        `UPDATE cards
           SET state=$1, reps=$2, ease=$3, interval_days=$4, due=$5, last_reviewed=$6
         WHERE id=$7`,
        [
          updated.state,
          updated.reps,
          updated.ease,
          updated.interval,
          updated.due,
          updated.lastReviewed ?? null,
          req.params.id,
        ],
      )
      res.json(updated)
    }),
  )

  app.post(
    '/api/import',
    ah(async (req, res) => {
      const { deckId, cards } = req.body as {
        deckId: string
        cards: Partial<Card>[]
      }
      const created: Card[] = []
      for (const c of cards) {
        const card = newCard(deckId, c)
        await pool.query(CARD_INSERT_SQL, cardInsertParams(card))
        created.push(card)
      }
      res.json({ cards: created, count: created.length })
    }),
  )

  app.use(
    (err: Error, _req: Request, res: Response, _next: NextFunction) => {
      console.error(err)
      res.status(500).json({ error: 'Internal server error' })
    },
  )

  app.listen(PORT, () => {
    console.log(`MyAnki API listening on :${PORT}`)
  })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

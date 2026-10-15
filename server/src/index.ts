import fs from 'fs'
import path from 'path'
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

// Card images are written to a local folder and served back as static files
// (rather than stored in the database).
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads')
app.use('/api/uploads', express.static(UPLOAD_DIR))

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
    frontImage: data.frontImage ?? undefined,
    backImage: data.backImage ?? undefined,
    tags: data.tags ?? [],
    state: 'new',
    reps: 0,
    ease: INITIAL_EASE,
    interval: 0,
    due: now,
    createdAt: now,
  }
}

function removeUpload(url?: string | null): void {
  if (!url) return
  const prefix = '/api/uploads/'
  if (!url.startsWith(prefix)) return
  const name = path.basename(url.slice(prefix.length))
  if (!name) return
  fs.promises.unlink(path.join(UPLOAD_DIR, name)).catch(() => {})
}

async function main() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  await initSchema()

  app.get('/api/health', (_req, res) => res.json({ ok: true }))

  // Upload a card image (base64 data URL) → write to disk, return its URL.
  app.post(
    '/api/images',
    ah(async (req, res) => {
      const { data } = req.body as { data?: string }
      const m =
        typeof data === 'string'
          ? data.match(/^data:image\/(png|jpe?g|webp|gif);base64,([A-Za-z0-9+/=]+)$/)
          : null
      if (!m) return res.status(400).json({ error: 'invalid image data URL' })
      const buf = Buffer.from(m[2], 'base64')
      if (buf.length === 0 || buf.length > 5 * 1024 * 1024) {
        return res.status(413).json({ error: 'image too large' })
      }
      const ext = m[1] === 'jpeg' ? 'jpg' : m[1]
      const name = `${uid()}.${ext}`
      await fs.promises.writeFile(path.join(UPLOAD_DIR, name), buf)
      res.json({ url: `/api/uploads/${name}` })
    }),
  )

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
      const { front, back, text, audioData, ttsLang, tags, frontImage, backImage } =
        req.body as {
          front?: string
          back?: string
          text?: string
          audioData?: string
          ttsLang?: string
          tags?: string[]
          frontImage?: string
          backImage?: string
        }
      const old = await pool.query(
        'SELECT front_image, back_image FROM cards WHERE id=$1',
        [req.params.id],
      )
      const oldFront = old.rows[0]?.front_image as string | undefined
      const oldBack = old.rows[0]?.back_image as string | undefined
      await pool.query(
        `UPDATE cards
           SET front=$1, back=$2, text=$3, audio_data=$4, tts_lang=$5, tags=$6,
               front_image=$7, back_image=$8
         WHERE id=$9`,
        [
          front ?? '',
          back ?? '',
          text ?? null,
          audioData ?? null,
          ttsLang ?? null,
          tags ?? [],
          frontImage ?? null,
          backImage ?? null,
          req.params.id,
        ],
      )
      // Delete replaced/removed image files (the editor always sends both fields).
      if (oldFront && oldFront !== frontImage) removeUpload(oldFront)
      if (oldBack && oldBack !== backImage) removeUpload(oldBack)
      const r = await pool.query('SELECT * FROM cards WHERE id=$1', [
        req.params.id,
      ])
      res.json(rowToCard(r.rows[0]))
    }),
  )

  app.delete(
    '/api/cards/:id',
    ah(async (req, res) => {
      const r = await pool.query(
        'SELECT front_image, back_image FROM cards WHERE id=$1',
        [req.params.id],
      )
      const row = r.rows[0]
      await pool.query('DELETE FROM cards WHERE id=$1', [req.params.id])
      if (row) {
        removeUpload(row.front_image as string | undefined)
        removeUpload(row.back_image as string | undefined)
      }
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

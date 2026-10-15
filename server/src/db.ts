import { Pool } from 'pg'
import type { Card, Deck } from './types'

export const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export async function initSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS decks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      deck_id TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      front TEXT NOT NULL DEFAULT '',
      back TEXT NOT NULL DEFAULT '',
      text TEXT,
      audio_data TEXT,
      tts_lang TEXT,
      front_image TEXT,
      back_image TEXT,
      tags TEXT[] NOT NULL DEFAULT '{}',
      state TEXT NOT NULL DEFAULT 'new',
      reps INTEGER NOT NULL DEFAULT 0,
      ease DOUBLE PRECISION NOT NULL DEFAULT 2.5,
      interval_days DOUBLE PRECISION NOT NULL DEFAULT 0,
      due BIGINT NOT NULL,
      created_at BIGINT NOT NULL,
      last_reviewed BIGINT
    );
  `)

  // Columns added after the initial schema; safe to run on existing databases.
  await pool.query(`
    ALTER TABLE cards ADD COLUMN IF NOT EXISTS front_image TEXT;
    ALTER TABLE cards ADD COLUMN IF NOT EXISTS back_image TEXT;
  `)
}

export function rowToDeck(row: Record<string, unknown>): Deck {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? undefined,
    createdAt: Number(row.created_at),
  }
}

export function rowToCard(row: Record<string, unknown>): Card {
  return {
    id: row.id as string,
    deckId: row.deck_id as string,
    type: row.type as Card['type'],
    front: row.front as string,
    back: row.back as string,
    text: (row.text as string) ?? undefined,
    audioData: (row.audio_data as string) ?? undefined,
    ttsLang: (row.tts_lang as string) ?? undefined,
    frontImage: (row.front_image as string) ?? undefined,
    backImage: (row.back_image as string) ?? undefined,
    tags: (row.tags as string[]) ?? [],
    state: row.state as Card['state'],
    reps: Number(row.reps),
    ease: Number(row.ease),
    interval: Number(row.interval_days),
    due: Number(row.due),
    createdAt: Number(row.created_at),
    lastReviewed:
      row.last_reviewed != null ? Number(row.last_reviewed) : undefined,
  }
}

export const CARD_INSERT_SQL = `
  INSERT INTO cards
    (id, deck_id, type, front, back, text, audio_data, tts_lang, front_image,
     back_image, tags, state, reps, ease, interval_days, due, created_at)
  VALUES
    ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
`

export function cardInsertParams(card: Card): unknown[] {
  return [
    card.id,
    card.deckId,
    card.type,
    card.front,
    card.back,
    card.text ?? null,
    card.audioData ?? null,
    card.ttsLang ?? null,
    card.frontImage ?? null,
    card.backImage ?? null,
    card.tags,
    card.state,
    card.reps,
    card.ease,
    card.interval,
    card.due,
    card.createdAt,
  ]
}

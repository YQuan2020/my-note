export type SplitMode = 'sentence-basic' | 'sentence-cloze' | 'word-basic'

export interface SplitResult {
  front: string
  back: string
  /** cloze 卡的带标记原文 */
  text?: string
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'at', 'for',
  'with', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'it', 'this',
  'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'his',
  'her', 'its', 'their', 'as', 'by', 'from', 'not', 'no', 'so', 'if', 'then',
  'than', 'too', 'very', 'can', 'will', 'just', 'do', 'does', 'did', 'have',
  'has', 'had', 'my', 'me', 'your', 'our', 'us', 'them', 'him', 'what',
  'which', 'who', 'whom', 'when', 'where', 'why', 'how', 'all', 'any', 'both',
  'each', 'few', 'more', 'most', 'other', 'some', 'such', 'only', 'own',
  'same', 'up', 'down', 'out', 'about', 'into', 'over', 'after', 'before',
  'between', 'under', 'again', 'there', 'here', 'would', 'should', 'could',
  'shall', 'may', 'might', 'must', 'also', 'new', 'one', 'two',
])

/** 按句号/问号/感叹号 + 空格切分句子 */
export function splitSentences(text: string): string[] {
  const raw = text.replace(/\s+/g, ' ').trim()
  if (!raw) return []
  return raw
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** 提取去重单词，过滤停用词 */
export function extractWords(text: string): string[] {
  const words = text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? []
  const seen = new Set<string>()
  const result: string[] = []
  for (const w of words) {
    if (STOPWORDS.has(w) || seen.has(w)) continue
    seen.add(w)
    result.push(w)
  }
  return result
}

/** 在句子中挖空第一个实词（长度 > 3 且非停用词） */
export function makeCloze(sentence: string): { text: string; back: string } | null {
  const words = sentence.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g)
  if (!words) return null
  const target = words.find((w) => w.length > 3 && !STOPWORDS.has(w.toLowerCase()))
  if (!target) return null
  const text = sentence.replace(target, `{{c1::${target}}}`)
  return { text, back: sentence }
}

/** 根据模式把整段文本拆成卡片草稿 */
export function splitText(text: string, mode: SplitMode): SplitResult[] {
  const sentences = splitSentences(text)
  if (mode === 'word-basic') {
    return extractWords(text).map((w) => ({ front: w, back: '' }))
  }
  if (mode === 'sentence-cloze') {
    return sentences
      .map((s) => {
        const c = makeCloze(s)
        return c
          ? { front: '', back: c.back, text: c.text }
          : { front: s, back: '' }
      })
      .filter(Boolean)
  }
  // sentence-basic
  return sentences.map((s) => ({ front: s, back: '' }))
}

/** cloze 渲染：正面显示为填空 */
export function renderClozeFront(text: string): string {
  return text.replace(/\{\{c\d+::([^}]*)\}\}/g, '____')
}

/** cloze 渲染：背面显示答案 */
export function renderClozeBack(text: string): string {
  return text.replace(/\{\{c\d+::([^}]*)\}\}/g, '$1')
}

/** 提取 cloze 答案列表 */
export function clozeAnswers(text: string): string[] {
  return [...text.matchAll(/\{\{c\d+::([^}]*)\}\}/g)].map((m) => m[1])
}

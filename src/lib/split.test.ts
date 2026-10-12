import { describe, it, expect } from 'vitest'
import { splitSentences, extractWords, makeCloze, splitText, renderClozeFront, renderClozeBack } from './split'

describe('splitSentences', () => {
  it('按标点切分', () => {
    const s = splitSentences('Hello world. How are you? I am fine!')
    expect(s).toEqual(['Hello world.', 'How are you?', 'I am fine!'])
  })
  it('空文本返回空数组', () => {
    expect(splitSentences('')).toEqual([])
  })
})

describe('extractWords', () => {
  it('去重并过滤停用词', () => {
    const words = extractWords('The quick brown fox and the quick fox')
    expect(words).toContain('quick')
    expect(words).toContain('brown')
    expect(words).toContain('fox')
    expect(words).not.toContain('the')
    expect(words).not.toContain('and')
    expect(words.length).toBe(3)
  })
})

describe('makeCloze', () => {
  it('挖空第一个实词', () => {
    const r = makeCloze('The quick brown fox jumps over the lazy dog.')
    expect(r).not.toBeNull()
    expect(r!.text).toContain('{{c1::quick}}')
    expect(r!.back).toBe('The quick brown fox jumps over the lazy dog.')
  })
})

describe('cloze 渲染', () => {
  it('正面挖空、背面还原', () => {
    const text = 'The {{c1::quick}} fox'
    expect(renderClozeFront(text)).toBe('The ____ fox')
    expect(renderClozeBack(text)).toBe('The quick fox')
  })
})

describe('splitText', () => {
  it('sentence-basic 每句一张卡', () => {
    const r = splitText('Apple is red. Banana is yellow.', 'sentence-basic')
    expect(r.length).toBe(2)
    expect(r[0].front).toBe('Apple is red.')
    expect(r[0].back).toBe('')
  })
  it('word-basic 每词一张卡', () => {
    const r = splitText('Apple and banana and apple', 'word-basic')
    expect(r).toEqual([{ front: 'apple', back: '' }, { front: 'banana', back: '' }])
  })
  it('sentence-cloze 生成挖空', () => {
    const r = splitText('The weather is beautiful today.', 'sentence-cloze')
    expect(r.length).toBe(1)
    expect(r[0].text).toContain('{{c1::')
  })
})

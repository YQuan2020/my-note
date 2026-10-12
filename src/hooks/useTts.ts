import { useCallback } from 'react'

/**
 * 封装浏览器 Web Speech API，用于音频跟读卡片的发音。
 */
export function useTts() {
  const speak = useCallback((text: string, lang = 'en-US') => {
    if (!('speechSynthesis' in window) || !text.trim()) return
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = lang
    utter.rate = 0.95
    const voices = window.speechSynthesis.getVoices()
    const voice =
      voices.find((v) => v.lang.replace('_', '-').startsWith(lang)) ||
      voices.find((v) => v.lang.toLowerCase().startsWith('en'))
    if (voice) utter.voice = voice
    window.speechSynthesis.speak(utter)
  }, [])

  const stop = useCallback(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  }, [])

  return { speak, stop }
}

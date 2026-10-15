// Client-side image compression + upload. Keeps stored images small:
// resize to a max dimension and re-encode as JPEG before uploading, so the
// backend only ever writes compact files to its uploads folder.

const MAX_DIM = 1280
const JPEG_QUALITY = 0.72

export function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height))
      const width = Math.max(1, Math.round(img.width * scale))
      const height = Math.max(1, Math.round(img.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas is not available'))
        return
      }
      // White background so transparent PNGs don't become black in JPEG.
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}

export async function uploadImage(dataUrl: string): Promise<string> {
  const res = await fetch('/api/images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: dataUrl }),
  })
  if (!res.ok) throw new Error(`Image upload failed: HTTP ${res.status}`)
  const json = (await res.json()) as { url: string }
  return json.url
}

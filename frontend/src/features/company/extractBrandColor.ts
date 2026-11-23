function hexFromRgb(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0'))
    .join('')}`
}

function saturation(r: number, g: number, b: number) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max === 0) return 0
  return (max - min) / max
}

export async function extractBrandColor(file: File): Promise<string | null> {
  const bitmap = await createImageBitmap(file)
  const size = 48
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null
  context.drawImage(bitmap, 0, 0, size, size)
  const { data } = context.getImageData(0, 0, size, size)

  let bestScore = 0
  let best = [5, 150, 105]
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3]
    if (alpha < 180) continue
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const sat = saturation(r, g, b)
    const brightness = (r + g + b) / 3
    if (sat < 0.18 || brightness < 40 || brightness > 230) continue
    const score = sat * (1 - Math.abs(brightness - 120) / 180)
    if (score > bestScore) {
      bestScore = score
      best = [r, g, b]
    }
  }

  if (bestScore === 0) return null
  return hexFromRgb(best[0], best[1], best[2])
}

export async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

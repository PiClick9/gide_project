/**
 * Rasterises the delivered PDF page by page, so the REAL page breaks can be
 * checked. preview.mjs slices the HTML at a fixed height and does not show
 * where Chromium actually breaks pages - this does.
 *
 *   node render-pdf.mjs [scale]     # scale 1.4 ~ 130dpi, good enough to read
 *
 * Output: ./pages/pdf-NN.png
 * pdf.js runs inside Chromium and is pulled from a CDN, so no local install is
 * needed - but an internet connection is (same as the Pretendard font).
 */
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const PLAYWRIGHT = 'file:///C:/Users/PC-19/Desktop/piclick/rnd9/AEDI-V-DASHBOARD/node_modules/playwright/index.mjs'
const { chromium } = await import(PLAYWRIGHT)

const PDF = resolve(HERE, '..', 'AEDI-V-EXTENSION_사용가이드.pdf')
const OUT = join(HERE, 'pages')
const SCALE = Number(process.argv[2] || 1.4)
const PDFJS = 'https://unpkg.com/pdfjs-dist@5.4.149/build/pdf.mjs'
const WORKER = 'https://unpkg.com/pdfjs-dist@5.4.149/build/pdf.worker.mjs'

await rm(OUT, { recursive: true, force: true })
await mkdir(OUT, { recursive: true })

const pdfB64 = (await readFile(PDF)).toString('base64')

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } })
// about:blank has no origin, so give the page a real one for the CDN import.
await page.goto('https://unpkg.com/pdfjs-dist@5.4.149/package.json')
await page.setContent('<!doctype html><meta charset="utf-8"><body></body>')

const dataUrls = await page.evaluate(async ({ pdfB64, PDFJS, WORKER, SCALE }) => {
  const pdfjs = await import(PDFJS)
  pdfjs.GlobalWorkerOptions.workerSrc = WORKER

  const bytes = Uint8Array.from(atob(pdfB64), c => c.charCodeAt(0))
  const doc = await pdfjs.getDocument({ data: bytes }).promise

  const out = []
  for (let n = 1; n <= doc.numPages; n++) {
    const p = await doc.getPage(n)
    const viewport = p.getViewport({ scale: SCALE })
    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await p.render({ canvasContext: ctx, viewport }).promise
    out.push(canvas.toDataURL('image/png'))
  }
  return out
}, { pdfB64, PDFJS, WORKER, SCALE })

for (const [i, url] of dataUrls.entries()) {
  await writeFile(join(OUT, `pdf-${String(i + 1).padStart(2, '0')}.png`), Buffer.from(url.split(',')[1], 'base64'))
}

console.log(`rendered ${dataUrls.length} pages at scale ${SCALE} -> ${pathToFileURL(OUT).href}`)
await browser.close()

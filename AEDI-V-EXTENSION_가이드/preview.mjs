/**
 * Renders guide.html under print emulation and slices it into page-sized
 * images, so the paginated layout can be eyeballed without a PDF viewer.
 * Output: ./preview/page-NN.png
 */
import { mkdir, rm, readFile } from 'node:fs/promises'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const PLAYWRIGHT = 'file:///C:/Users/PC-19/Desktop/piclick/rnd9/AEDI-V-DASHBOARD/node_modules/playwright/index.mjs'
const { chromium } = await import(PLAYWRIGHT)

// A4 at 96dpi minus the print margins used in build-pdf.mjs.
const MM = 96 / 25.4
const PAGE_W = Math.round((210 - 26) * MM) // 184mm content column
const PAGE_H = Math.round((297 - 29) * MM) // 268mm content height

const OUT = join(HERE, 'preview')
await rm(OUT, { recursive: true, force: true })
await mkdir(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: PAGE_W, height: PAGE_H },
  deviceScaleFactor: 2,
})

await page.emulateMedia({ media: 'print' })
await page.goto(pathToFileURL(join(HERE, 'guide.html')).href, { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(400)

const total = await page.evaluate(() => document.documentElement.scrollHeight)
const pages = Math.ceil(total / PAGE_H)

for (let i = 0; i < pages; i++) {
  await page.screenshot({
    path: join(OUT, `page-${String(i + 1).padStart(2, '0')}.png`),
    clip: { x: 0, y: i * PAGE_H, width: PAGE_W, height: Math.min(PAGE_H, total - i * PAGE_H) },
    fullPage: true,
  })
}

console.log(`content height ${total}px → ~${pages} pages (approximate; real breaks avoid splitting blocks)`)

// Real page count, straight from the generated PDF.
const pdf = await readFile(resolve(HERE, '..', 'AEDI-V-EXTENSION_사용가이드.pdf')).catch(() => null)
if (pdf) {
  const count = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length
  console.log(`PDF reports ${count} pages`)
}

await browser.close()

/**
 * Renders guide.html to the delivered PDF.
 *
 *   node build-pdf.mjs
 *
 * Screenshots live in ./shots and are copied from the extension's bundled
 * English tutorial images (aedi-v/images/tutorial*_en.png).
 * Output lands in the gide_project root.
 */
import { pathToFileURL } from 'node:url'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const PLAYWRIGHT = 'file:///C:/Users/PC-19/Desktop/piclick/rnd9/AEDI-V-DASHBOARD/node_modules/playwright/index.mjs'
const { chromium } = await import(PLAYWRIGHT)

const SOURCE = join(HERE, 'guide.html')
const OUTPUT = resolve(HERE, '..', 'AEDI-V-EXTENSION_사용가이드.pdf')

const browser = await chromium.launch()
const page = await browser.newPage()

await page.goto(pathToFileURL(SOURCE).href, { waitUntil: 'networkidle' })
// Pretendard comes from a CDN; wait for it so the Korean text is not measured
// against the fallback and reflowed after pagination.
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(400)

const footer = `
  <div style="width:100%;padding:0 13mm;font-family:'Malgun Gothic',sans-serif;
              font-size:7.5pt;color:#8b8896;display:flex;justify-content:space-between;">
    <span>AEDI-V 크리에이터 사용 가이드</span>
    <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
  </div>`

await page.pdf({
  path: OUTPUT,
  format: 'A4',
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: '<span></span>',
  footerTemplate: footer,
  margin: { top: '14mm', bottom: '15mm', left: '13mm', right: '13mm' },
})

await browser.close()
console.log(`PDF written: ${OUTPUT}`)

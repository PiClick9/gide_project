/**
 * Screenshot harness for the AEDI-V Dashboard user guide.
 *
 *   npm run dev -- --port 5199   # in the AEDI-V-DASHBOARD repo
 *   node capture.mjs
 *
 * Every /api/v1 call is fulfilled from mock-data.mjs, so the app renders real
 * screens without a backend and the same run always produces the same images.
 * The dashboard repo is never modified.
 */
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const PLAYWRIGHT = 'file:///C:/Users/PC-19/Desktop/piclick/rnd9/AEDI-V-DASHBOARD/node_modules/playwright/index.mjs'
const { chromium } = await import(PLAYWRIGHT)
const { buildPool, buildReport, EMPTY_REPORT } = await import('./mock-data.mjs')

const BASE = process.env.GUIDE_URL ?? 'http://localhost:5199'
const OUT = join(HERE, 'shots')
const TODAY = '2026-08-04'

const pool = buildPool(TODAY)

/** Flipped by the capture steps to force particular API outcomes. */
const state = { loginStatus: 200, empty: false }

await mkdir(OUT, { recursive: true })

const browser = await chromium.launch()

async function newPage(width, height) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
  })

  await context.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname.replace(/^.*\/api\/v1/, '')

    if (path === '/auth/login') {
      if (state.loginStatus !== 200) {
        return route.fulfill({
          status: state.loginStatus,
          contentType: 'application/json',
          body: JSON.stringify({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password.' } }),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access_token: 'mock-token', token_type: 'bearer', expires_in: 3600 }),
      })
    }

    if (path === '/auth/logout') return route.fulfill({ status: 204, body: '' })

    if (path.startsWith('/reports/creator-signups')) {
      const query = {
        startDate: url.searchParams.get('startDate'),
        endDate: url.searchParams.get('endDate'),
        dateField: url.searchParams.get('dateField'),
        groupBy: url.searchParams.get('groupBy'),
      }
      const data = state.empty ? EMPTY_REPORT(query) : buildReport(pool, query)
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data }),
      })
    }

    return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' })
  })

  const page = await context.newPage()
  // The app pulls Pretendard from a CDN; block it only if it stalls.
  page.setDefaultTimeout(15000)
  return page
}

/** Union bounding box of the given selectors, in viewport coordinates. */
async function region(page, selectors, pad = 0) {
  const box = await page.evaluate((sels) => {
    const boxes = sels
      .map((s) => document.querySelector(s))
      .filter(Boolean)
      .map((el) => el.getBoundingClientRect())
    if (!boxes.length) return null
    return {
      left: Math.min(...boxes.map((b) => b.left)),
      top: Math.min(...boxes.map((b) => b.top)),
      right: Math.max(...boxes.map((b) => b.right)),
      bottom: Math.max(...boxes.map((b) => b.bottom)),
    }
  }, selectors)
  if (!box) throw new Error(`No element matched: ${selectors.join(', ')}`)

  const view = page.viewportSize()
  const x = Math.max(0, box.left - pad)
  const y = Math.max(0, box.top - pad)
  return {
    x,
    y,
    width: Math.min(view.width - x, box.right - box.left + pad * 2 + (box.left - pad < 0 ? box.left - pad : 0)),
    height: Math.min(view.height - y, box.bottom - box.top + pad * 2 + (box.top - pad < 0 ? box.top - pad : 0)),
  }
}

async function shot(page, name, selectors, pad = 14) {
  const clip = selectors ? await region(page, selectors, pad) : undefined
  await page.screenshot({ path: join(OUT, `${name}.png`), clip })
  console.log(`  ${name}.png`)
}

/** Wait until the summary cards hold API values rather than the 0 placeholders. */
async function waitForData(page) {
  await page.waitForFunction(() => {
    const el = document.querySelector('[class*="cardValue"]')
    return el && el.textContent.trim() !== '0'
  })
  await page.waitForTimeout(900) // chart transition is 0.6s
}

async function login(page) {
  await page.fill('input[autocomplete="username"]', 'aedi-partner')
  await page.fill('input[autocomplete="current-password"]', 'Partner!2026')
  await page.click('button[type="submit"]')
  await page.waitForSelector('[class*="tableWrap"]')
  await waitForData(page)
}

/* ------------------------------------------------------------------ login -- */

console.log('Login screens')
{
  const page = await newPage(1440, 900)
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForSelector('button[type="submit"]')

  await shot(page, '01-login')

  await page.fill('input[autocomplete="username"]', 'aedi-partner')
  await page.fill('input[autocomplete="current-password"]', 'Partner!2026')
  await shot(page, '02-login-filled', ['[class*="card"]'], 22)

  await page.click('button[aria-label="Show password"]')
  await shot(page, '03-login-password-shown', ['[class*="card"]'], 22)
  await page.click('button[aria-label="Hide password"]')

  state.loginStatus = 401
  await page.click('button[type="submit"]')
  await page.waitForSelector('[role="alert"]')
  await shot(page, '04-login-error', ['[class*="card"]'], 22)
  state.loginStatus = 200

  await page.context().close()
}

/* ----------------------------------------------------------------- report -- */

console.log('Report screens')
{
  const page = await newPage(1440, 2000)
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await login(page)

  await shot(page, '10-report-full', ['header', 'nav[aria-label="Pagination"]'], 0)

  // Numbered overlay for the "화면 한눈에 보기" section. Each mark rings the
  // union of its selectors, so grouped controls (tabs + chart) read as one area.
  await page.evaluate(() => {
    const marks = [
      [['header'], '1'],
      [['[class*="dateRow"]'], '2'],
      [['[class*="summary"]'], '3'],
      [['[class*="graphTabs"]', '[class*="chartArea"]'], '4'],
      [['[class*="tableWrap"]', 'nav[aria-label="Pagination"]'], '5'],
    ]
    for (const [sels, n] of marks) {
      const boxes = sels
        .map((s) => document.querySelector(s))
        .filter(Boolean)
        .map((el) => el.getBoundingClientRect())
      if (!boxes.length) continue

      const left = Math.min(...boxes.map((b) => b.left)) + scrollX
      const top = Math.min(...boxes.map((b) => b.top)) + scrollY
      const right = Math.max(...boxes.map((b) => b.right)) + scrollX
      const bottom = Math.max(...boxes.map((b) => b.bottom)) + scrollY

      const ring = document.createElement('div')
      ring.dataset.guideMark = '1'
      Object.assign(ring.style, {
        position: 'absolute',
        left: `${Math.max(2, left - 4)}px`,
        top: `${Math.max(2, top - 4)}px`,
        width: `${right - Math.max(2, left - 4) + 4}px`,
        height: `${bottom - Math.max(2, top - 4) + 4}px`,
        border: '3px solid #7367f0',
        borderRadius: '12px',
        pointerEvents: 'none',
        zIndex: '9998',
      })

      // Full-bleed rows start at x=0, so keep the badge on-canvas.
      const badge = document.createElement('div')
      badge.dataset.guideMark = '1'
      badge.textContent = n
      Object.assign(badge.style, {
        position: 'absolute',
        left: `${Math.max(8, left - 22)}px`,
        top: `${Math.max(8, top - 22)}px`,
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: '#7367f0',
        color: '#fff',
        font: '800 21px/40px Pretendard, sans-serif',
        textAlign: 'center',
        boxShadow: '0 4px 12px rgba(115,103,240,.45)',
        pointerEvents: 'none',
        zIndex: '9999',
      })
      document.body.append(ring, badge)
    }
  })
  await shot(page, '11-report-annotated', ['header', 'nav[aria-label="Pagination"]'], 26)
  await page.evaluate(() => document.querySelectorAll('[data-guide-mark]').forEach((el) => el.remove()))

  await shot(page, '12-header', ['header'], 0)
  await shot(page, '20-duration-row', ['[class*="dateRow"]'], 18)

  // Date-field dropdown open.
  await page.click('button[class*="select"]')
  await page.waitForSelector('ul[role="listbox"]')
  await shot(page, '21-datefield-open', ['[class*="dateRow"]', 'ul[role="listbox"]'], 18)
  await page.keyboard.press('Escape')

  // End-date calendar: August 2026 with every day after today disabled.
  await page.click('button[aria-label="End date"]')
  await page.waitForSelector('[role="dialog"]')
  await shot(page, '22-calendar-end', ['[class*="dateRow"]', '[role="dialog"]'], 18)
  await page.keyboard.press('Escape')

  // Start-date calendar, showing the lower bound on the previous month.
  await page.click('button[aria-label="Start date"]')
  await page.waitForSelector('[role="dialog"]')
  await page.click('button[aria-label="Previous month"]')
  await shot(page, '23-calendar-start-min', ['[class*="dateRow"]', '[role="dialog"]'], 18)
  await page.keyboard.press('Escape')

  await shot(page, '24-preset-tabs', ['[class*="dateTabs"]'], 16)
  await shot(page, '30-cards', ['[class*="summary"]'], 16)
  await shot(page, '31-card-single', ['[class*="summary"] > div:first-child'], 16)

  await shot(page, '40-chart-daily', ['[class*="graphTabs"]', '[class*="chartArea"]'], 16)

  await shot(page, '50-table', ['[class*="tableWrap"]'], 0)
  await shot(page, '51-pagination', ['nav[aria-label="Pagination"]'], 16)

  // Page 2 of the table, to show the pager in a non-first state.
  await page.click('nav[aria-label="Pagination"] button[aria-label="Next page"]')
  await page.waitForTimeout(250)
  await shot(page, '52-pagination-page2', ['nav[aria-label="Pagination"]'], 16)

  // Weekly grouping reads best over a month-long range.
  await page.click('button:has-text("This Month")')
  await waitForData(page)
  await page.click('button:has-text("Weekly")')
  await waitForData(page)
  await shot(page, '41-chart-weekly', ['[class*="graphTabs"]', '[class*="chartArea"]'], 16)

  await page.click('button:has-text("Daily")')
  await waitForData(page)
  await page.click('button:has-text("Last Month")')
  await waitForData(page)
  await shot(page, '42-chart-last-month', ['[class*="graphTabs"]', '[class*="chartArea"]'], 16)

  // Empty state.
  state.empty = true
  await page.click('button:has-text("Today")')
  await page.waitForSelector('[class*="emptyRow"]')
  await page.waitForTimeout(600)
  await shot(page, '60-empty-cards', ['[class*="summary"]'], 16)
  await shot(page, '61-empty-table', ['[class*="tableWrap"]'], 0)
  state.empty = false

  await page.context().close()
}

await browser.close()
console.log('Done.')

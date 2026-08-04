/**
 * Deterministic stand-in for the Creator Sign-up Report API.
 *
 * The guide's screenshots have to be reproducible, so the pool is built from a
 * seeded PRNG rather than Math.random. Shapes mirror src/api/report.ts exactly.
 *
 * Unlike the demo generator in the app, sign-up / subscription-start / last-
 * payment dates deliberately differ per creator — the guide's "기준 날짜 필드"
 * section is only meaningful if the three fields actually disagree.
 */

const SEED = 20260804

/** mulberry32 — small, fast, and stable across Node versions. */
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pad = (n) => String(n).padStart(2, '0')
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const parse = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const addDays = (s, n) => {
  const d = parse(s)
  d.setDate(d.getDate() + n)
  return iso(d)
}
const round2 = (n) => Math.round(n * 100) / 100

const FIRST = [
  'James', 'Olivia', 'Liam', 'Emma', 'Noah', 'Ava', 'William', 'Sophia',
  'Benjamin', 'Isabella', 'Lucas', 'Mia', 'Henry', 'Charlotte', 'Alexander',
  'Amelia', 'Michael', 'Harper', 'Daniel', 'Evelyn', 'Matthew', 'Abigail',
  'Jackson', 'Emily', 'Sebastian', 'Elizabeth', 'David', 'Sofia', 'Joseph',
  'Ella', 'Samuel', 'Grace', 'Owen', 'Chloe', 'Gabriel', 'Victoria',
]
const LAST = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
  'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson',
  'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee',
  'Perez', 'Thompson', 'White', 'Harris', 'Clark', 'Lewis', 'Walker',
  'Young', 'Allen', 'King', 'Wright', 'Scott', 'Green', 'Adams', 'Baker',
]

/** Only two plans are sold. Total Payment = plan price x 1.1, commission = 20% of that. */
const PLANS = [
  { name: 'Studio', promoCredit: '1:00:00', price: 97 },
  { name: 'Studio+', promoCredit: '1:00:00', price: 244 },
]

/** Every creator the mock knows about, from the first of last month to today. */
export function buildPool(todayStr) {
  const rand = rng(SEED)
  const pick = (arr) => arr[Math.floor(rand() * arr.length)]
  const int = (min, max) => min + Math.floor(rand() * (max - min + 1))

  const today = parse(todayStr)
  const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)

  const creators = []
  /** Sign-ups that never converted, kept per day so the sign-up bar stays taller. */
  const leadsByDay = {}
  let id = 1

  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const day = iso(d)
    const count = int(1, 3)

    for (let k = 0; k < count; k++) {
      const plan = PLANS[rand() < 0.68 ? 0 : 1]
      const totalPayment = round2(plan.price * 1.1)
      // Subscription starts on the sign-up day or shortly after; the last
      // payment is the most recent monthly charge. Neither may run past today.
      let subStart = addDays(day, int(0, 2))
      if (subStart > todayStr) subStart = todayStr
      const monthsPaid = rand() < 0.35 ? 1 : 0
      let lastPayment = addDays(subStart, monthsPaid * 30)
      if (lastPayment > todayStr) lastPayment = subStart

      creators.push({
        id: `CR-${String(id++).padStart(4, '0')}`,
        signUpDate: day,
        creatorName: `${pick(FIRST)} ${pick(LAST)}`,
        promoCredit: plan.promoCredit,
        subscriptionStartDate: subStart,
        subscriptionPlan: plan.name,
        lastPaymentDate: lastPayment,
        totalPayment,
        commission: round2(totalPayment * 0.2),
        currency: 'USD',
      })
    }

    leadsByDay[day] = int(1, count + 1)
  }

  return { creators, leadsByDay }
}

const FIELD_KEY = {
  SIGN_UP_DATE: 'signUpDate',
  SUBSCRIPTION_START_DATE: 'subscriptionStartDate',
  LAST_PAYMENT_DATE: 'lastPaymentDate',
}

/** Monday of the week the ISO date falls in. */
const weekStart = (s) => {
  const d = parse(s)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return iso(d)
}

const label = (s) => {
  const [, m, d] = s.split('-')
  return `${m}/${d}`
}

const inRange = (v, start, end) => v >= start && v <= end

function metrics(pool, key, start, end) {
  const rows = pool.creators.filter((c) => inRange(c[key], start, end))
  const subscribers = rows.length

  // Leads are keyed by sign-up day, so only days inside the window count.
  let signUps = subscribers
  for (const [day, leads] of Object.entries(pool.leadsByDay)) {
    if (inRange(day, start, end)) signUps += leads
  }

  const totalPayment = round2(rows.reduce((s, c) => s + c.totalPayment, 0))
  const commission = round2(rows.reduce((s, c) => s + c.commission, 0))
  return {
    rows,
    signUps,
    subscribers,
    subscriptionRate: signUps ? Math.round((subscribers / signUps) * 100) : 0,
    totalPayment,
    commission,
  }
}

function chartOf(pool, rows, key, start, end, groupBy) {
  const bucketKey = groupBy === 'WEEKLY' ? weekStart : (s) => s
  const map = new Map()

  for (const c of rows) {
    const k = bucketKey(c[key])
    const cur = map.get(k) ?? { subscribers: 0, commission: 0, signUps: 0 }
    cur.subscribers += 1
    cur.commission = round2(cur.commission + c.commission)
    map.set(k, cur)
  }
  for (const [day, leads] of Object.entries(pool.leadsByDay)) {
    if (!inRange(day, start, end)) continue
    const k = bucketKey(day)
    const cur = map.get(k)
    if (cur) cur.signUps += leads
  }

  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, v]) => ({
      date,
      label: label(date),
      signUps: v.subscribers + v.signUps,
      subscribers: v.subscribers,
      commission: v.commission,
    }))
}

/** The full report payload for one query — matches CreatorSignupReport. */
export function buildReport(pool, { startDate, endDate, dateField, groupBy }) {
  const key = FIELD_KEY[dateField] ?? 'signUpDate'
  const current = metrics(pool, key, startDate, endDate)

  // The comparison period is the same length, immediately before the range.
  const span = Math.round((parse(endDate) - parse(startDate)) / 86400000) + 1
  const prevEnd = addDays(startDate, -1)
  const prevStart = addDays(prevEnd, -(span - 1))
  const previous = metrics(pool, key, prevStart, prevEnd)

  const rows = [...current.rows].sort((a, b) => (a[key] < b[key] ? 1 : -1))

  return {
    range: { startDate, endDate, dateField, groupBy },
    summary: {
      signUps: current.signUps,
      subscribers: current.subscribers,
      subscriptionRate: current.subscriptionRate,
      totalPayment: current.totalPayment,
      commission: current.commission,
    },
    comparison: {
      signUps: previous.signUps,
      subscribers: previous.subscribers,
      subscriptionRate: previous.subscriptionRate,
      totalPayment: previous.totalPayment,
      commission: previous.commission,
    },
    chart: chartOf(pool, current.rows, key, startDate, endDate, groupBy),
    creators: rows,
    pagination: {
      page: 1,
      pageSize: 100,
      totalItems: rows.length,
      totalPages: 1,
    },
  }
}

export const EMPTY_REPORT = (query) => ({
  range: query,
  summary: { signUps: 0, subscribers: 0, subscriptionRate: 0, totalPayment: 0, commission: 0 },
  comparison: { signUps: 0, subscribers: 0, subscriptionRate: 0, totalPayment: 0, commission: 0 },
  chart: [],
  creators: [],
  pagination: { page: 1, pageSize: 100, totalItems: 0, totalPages: 0 },
})

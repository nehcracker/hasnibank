/**
 * eligibilityModel.js
 *
 * Pure scoring model for the Hasni Bank fundability self-check.
 * No React imports — safe to test outside a browser environment.
 *
 * 10 questions across 5 weighted pillars.
 * Each answer: 0 (No) / 0.5 (Partially) / 1 (Yes).
 * Pillar score = average of its two answers × pillar weight.
 * Total = sum of pillar scores (out of 100), displayed as score/10 (1 dp).
 * Bands: ≥7.5 "Application-ready" · 5–7.4 "Conditionally ready" · <5 "Not yet ready".
 * Fix list: pillars earning <60% of their weight, ordered by points forgone (descending).
 */

// ── Pillars ─────────────────────────────────────────────────────────────────

export const pillars = [
  {
    key: 'financial',
    label: 'Financial records',
    weight: 25,
    remediation:
      'Prepare 2 years of management accounts or engage an accountant for an audited set.',
  },
  {
    key: 'collateral',
    label: 'Collateral and security',
    weight: 20,
    remediation:
      'Identify tangible assets available as security and obtain formal valuations or title documentation.',
  },
  {
    key: 'project_docs',
    label: 'Project/business documentation',
    weight: 20,
    remediation:
      'Commission a business plan or feasibility study and compile any signed contracts or offtake agreements.',
  },
  {
    key: 'compliance',
    label: 'Compliance',
    weight: 15,
    remediation:
      'Renew business registrations and file outstanding tax returns before submitting a financing application.',
  },
  {
    key: 'capacity',
    label: 'Capacity',
    weight: 20,
    remediation:
      'Prepare a management CV and track record summary together with a schedule of existing debt obligations and repayment history.',
  },
]

// ── Questions ────────────────────────────────────────────────────────────────

export const questions = [
  // — Financial records (weight 25) —
  {
    id: 'q1',
    pillar: 'financial',
    text: 'Do you have audited or management accounts available?',
    options: [
      { label: 'No accounts available', value: 0 },
      { label: 'Management accounts only', value: 0.5 },
      { label: 'Full audited accounts', value: 1 },
    ],
  },
  {
    id: 'q2',
    pillar: 'financial',
    text: 'What best describes your revenue trend over the last two years?',
    options: [
      { label: 'Declining', value: 0 },
      { label: 'Stable', value: 0.5 },
      { label: 'Growing', value: 1 },
    ],
  },

  // — Collateral and security (weight 20) —
  {
    id: 'q3',
    pillar: 'collateral',
    text: 'Do you have collateral available to secure financing?',
    options: [
      { label: 'No collateral available', value: 0 },
      { label: 'Partial or informal assets', value: 0.5 },
      { label: 'Yes, formally valued assets', value: 1 },
    ],
  },
  {
    id: 'q4',
    pillar: 'collateral',
    text: 'Is there clean title or documented ownership evidence for the proposed security?',
    options: [
      { label: 'No', value: 0 },
      { label: 'In progress or partially resolved', value: 0.5 },
      { label: 'Yes, fully documented', value: 1 },
    ],
  },

  // — Project/business documentation (weight 20) —
  {
    id: 'q5',
    pillar: 'project_docs',
    text: 'Do you have a current business plan or feasibility study?',
    options: [
      { label: 'No', value: 0 },
      { label: 'Draft or partial', value: 0.5 },
      { label: 'Complete and current', value: 1 },
    ],
  },
  {
    id: 'q6',
    pillar: 'project_docs',
    text: 'Do you have signed offtake agreements or revenue contracts in hand?',
    options: [
      { label: 'No', value: 0 },
      { label: 'Letters of intent or informal agreements', value: 0.5 },
      { label: 'Fully executed contracts', value: 1 },
    ],
  },

  // — Compliance (weight 15) —
  {
    id: 'q7',
    pillar: 'compliance',
    text: 'Is your business registration current and in good standing?',
    options: [
      { label: 'No or expired', value: 0 },
      { label: 'Renewal in progress', value: 0.5 },
      { label: 'Yes, fully current', value: 1 },
    ],
  },
  {
    id: 'q8',
    pillar: 'compliance',
    text: 'Is your organisation tax-compliant with no outstanding liabilities?',
    options: [
      { label: 'Outstanding liabilities exist', value: 0 },
      { label: 'Payment arrangements in place', value: 0.5 },
      { label: 'Fully compliant', value: 1 },
    ],
  },

  // — Capacity (weight 20) —
  {
    id: 'q9',
    pillar: 'capacity',
    text: 'Does the management team have a documented track record in this sector?',
    options: [
      { label: 'No relevant track record', value: 0 },
      { label: 'Partial or transferable experience', value: 0.5 },
      { label: 'Strong documented track record', value: 1 },
    ],
  },
  {
    id: 'q10',
    pillar: 'capacity',
    text: 'Do you have a clean existing debt service history?',
    options: [
      { label: 'Defaults or arrears on record', value: 0 },
      { label: 'Minor issues now resolved', value: 0.5 },
      { label: 'Clean history or no prior debt', value: 1 },
    ],
  },
]

// ── Internal lookup: pillar key → question ids (in definition order) ─────────

const PILLAR_QUESTION_IDS = {}
for (const q of questions) {
  if (!PILLAR_QUESTION_IDS[q.pillar]) PILLAR_QUESTION_IDS[q.pillar] = []
  PILLAR_QUESTION_IDS[q.pillar].push(q.id)
}

// ── getBand ──────────────────────────────────────────────────────────────────

/**
 * Return the eligibility band for a given score (0–10).
 * @param {number} score
 * @returns {'Application-ready'|'Conditionally ready'|'Not yet ready'}
 */
export function getBand(score) {
  if (score >= 7.5) return 'Application-ready'
  if (score >= 5.0) return 'Conditionally ready'
  return 'Not yet ready'
}

// ── scoreAnswers ─────────────────────────────────────────────────────────────

/**
 * Compute fundability score from a map of question answers.
 *
 * @param {Record<string, 0|0.5|1>} answers  — map of question id → answer value
 * @returns {{ score: number, band: string, fixes: Array }}
 *
 * score    — rounded to 1 dp, out of 10
 * band     — eligibility band label
 * fixes    — pillars scoring below 60% of their weight, sorted by points forgone descending
 *            each: { pillar, label, remediation, pointsForgone }
 */
export function scoreAnswers(answers) {
  let total = 0
  const pillarEarned = {}

  for (const pillar of pillars) {
    const ids = PILLAR_QUESTION_IDS[pillar.key] ?? []
    const values = ids.map(id => answers[id] ?? 0)
    const avg = values.length > 0
      ? values.reduce((sum, v) => sum + v, 0) / values.length
      : 0
    const earned = avg * pillar.weight
    pillarEarned[pillar.key] = earned
    total += earned
  }

  const raw = total / 10
  const score = Math.round(raw * 10) / 10
  const band = getBand(score)

  const threshold = 0.6
  const fixes = pillars
    .filter(p => pillarEarned[p.key] < p.weight * threshold)
    .map(p => ({
      pillar: p.key,
      label: p.label,
      remediation: p.remediation,
      pointsForgone: p.weight - pillarEarned[p.key],
    }))
    // Stable descending sort — JS Array.sort is stable (ES2019+)
    .sort((a, b) => b.pointsForgone - a.pointsForgone)

  return { score, band, fixes }
}

/**
 * assessment.js
 *
 * Pure assessment helpers for the staff workspace. No React, no Supabase.
 *
 * The assessment score is derived client-side from the findings rollup —
 * there is deliberately no stored score column, so this module is the
 * single source of truth for the header chip and the pillar summaries.
 */

/**
 * The five assessment pillars. Maxima mirror the eligibility self-check
 * weights (25/20/20/15/20) scaled to a 10-point scale; keys match the
 * phase3c assessment_findings pillar check constraint.
 */
export const ASSESSMENT_PILLARS = [
  { key: 'financial_records', label: 'Financial records',        max: 2.5 },
  { key: 'collateral',        label: 'Collateral and security',  max: 2.0 },
  { key: 'documentation',     label: 'Documentation',            max: 2.0 },
  { key: 'compliance',        label: 'Compliance',               max: 1.5 },
  { key: 'capacity',          label: 'Capacity',                 max: 2.0 },
]

export const SEVERITY_LABELS = {
  informational:        'Informational',
  requires_improvement: 'Requires improvement',
  critical:             'Critical',
}

/**
 * Rolls finding scores up into pillar scores and a /10 total.
 *
 * Per pillar: sum of finding scores (any status — resolving a finding
 * addresses the issue, it does not erase the assessment), capped at the
 * pillar max. Pillars with no findings are unassessed and contribute 0.
 *
 * @param {Array<{ pillar: string, score: number|string }>} findings
 * @returns {{ total: number|null, byPillar: object }}
 *   total is null until at least one finding exists.
 */
export function rollupScore(findings) {
  const byPillar = {}
  for (const p of ASSESSMENT_PILLARS) {
    const pillarFindings = findings.filter((f) => f.pillar === p.key)
    const raw = pillarFindings.reduce((sum, f) => sum + Number(f.score || 0), 0)
    byPillar[p.key] = {
      score: Math.min(raw, p.max),
      max: p.max,
      assessed: pillarFindings.length > 0,
    }
  }
  const total = findings.length === 0
    ? null
    : ASSESSMENT_PILLARS.reduce((sum, p) => sum + byPillar[p.key].score, 0)
  return { total, byPillar }
}

/**
 * Stage-gate check: the gate warns (never blocks) while open critical
 * findings or open information requests remain.
 *
 * @param {Array<{ severity: string, status: string }>} findings
 * @param {Array<{ status: string }>} rfis
 * @returns {{ criticalOpen: number, rfisOpen: number, clear: boolean }}
 */
export function gateCheck(findings, rfis) {
  const criticalOpen = findings.filter(
    (f) => f.severity === 'critical' && f.status === 'open'
  ).length
  const rfisOpen = rfis.filter((r) => r.status === 'open').length
  return { criticalOpen, rfisOpen, clear: criticalOpen === 0 && rfisOpen === 0 }
}

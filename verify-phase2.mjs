import { chromium } from 'playwright'

const BASE = 'http://localhost:5174'
const EMAIL = 'nehlmac4@gmail.com'
const PASSWORD = 'Cashpoint789@!'

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const jsErrors = []

async function run() {
  const browser = await chromium.launch({ headless: false, slowMo: 50 })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  page.on('console', m => { if (m.type() === 'error') jsErrors.push(m.text()) })
  page.on('pageerror', e => jsErrors.push(e.message))

  // ── STEP 1: Login ─────────────────────────────────────
  console.log('\n── STEP 1: Login ──')
  await page.goto(`${BASE}/login`)
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard', { timeout: 10000 })
  console.log('✅ Logged in → /dashboard')

  // ── STEP 2: ApplicationStatus renders ─────────────────
  console.log('\n── STEP 2: ApplicationStatus ──')
  await sleep(1500)
  const h1 = await page.textContent('h1').catch(() => '')
  console.log(`   h1: "${h1}"`)
  const isStatusPage = h1.includes('Your Application')
  console.log(`✅ Shows ApplicationStatus (not old stub): ${isStatusPage}`)
  if (!isStatusPage) {
    console.log('⚠️  h1 was not "Your Application" — check if application exists for this user')
  }
  await page.screenshot({ path: 'verify-p2-01-dashboard.png' })

  // ── STEP 3: ProgressTracker ────────────────────────────
  console.log('\n── STEP 3: ProgressTracker ──')
  const stageLabels = [
    'Submitted', 'KYC Verification', 'Credit Assessment', 'Funder Matching',
    'Term Sheet', 'Offer Issued', 'Offer Accepted', 'Fee Payment', 'Funded'
  ]
  let allVisible = true
  for (const label of stageLabels) {
    const visible = await page.locator(`text="${label}"`).first().isVisible().catch(() => false)
    if (!visible) { allVisible = false; console.log(`   ❌ Missing stage: ${label}`) }
  }
  console.log(`✅ All 9 stage labels visible: ${allVisible}`)

  // Check active stage marker
  const activeCell = page.locator('[data-state="active"]').first()
  const activeCellExists = await activeCell.isVisible().catch(() => false)
  console.log(`✅ Active stage marker present: ${activeCellExists}`)

  const doneCell = page.locator('[data-state="done"]')
  const doneCellCount = await doneCell.count()
  console.log(`   Done stages count: ${doneCellCount}`)
  await page.screenshot({ path: 'verify-p2-02-tracker.png' })

  // ── STEP 4: ActionZone ─────────────────────────────────
  console.log('\n── STEP 4: ActionZone ──')
  const actionZoneText = await page.locator('text=/being reviewed/i').first().isVisible().catch(() => false)
  console.log(`✅ ActionZone shows "being reviewed": ${actionZoneText}`)
  const acceptBtn = await page.locator('button:has-text("Accept Offer")').isVisible().catch(() => false)
  console.log(`✅ Accept Offer button absent (status is submitted): ${!acceptBtn}`)

  // ── STEP 5: Timeline ───────────────────────────────────
  console.log('\n── STEP 5: Timeline ──')
  await sleep(500) // wait for events query
  const activityHeading = await page.locator('text="Activity"').isVisible().catch(() => false)
  console.log(`✅ Activity section heading present: ${activityHeading}`)
  const bodyText = await page.textContent('body').catch(() => '')
  const hasEvents = bodyText.includes('Status Update') || bodyText.includes('Advanced to')
  const hasEmpty = bodyText.includes('No activity recorded yet')
  console.log(`   Has events: ${hasEvents} | Empty state: ${hasEmpty}`)
  console.log(`✅ Timeline rendered (events or empty state): ${hasEvents || hasEmpty}`)
  await page.screenshot({ path: 'verify-p2-03-timeline.png' })

  // ── STEP 6: Refresh persistence ───────────────────────
  console.log('\n── STEP 6: Refresh → still status view ──')
  await page.reload()
  await sleep(1500)
  const h1After = await page.textContent('h1').catch(() => '')
  console.log(`✅ h1 after refresh: "${h1After}" (persisted: ${h1After.includes('Your Application')})`)
  await page.screenshot({ path: 'verify-p2-04-after-refresh.png' })

  // ── STEP 7: Probe — navigate away and back ─────────────
  console.log('\n🔍 Probe: nav away → back → still status ──')
  await page.goto(`${BASE}/`)
  await sleep(400)
  await page.goto(`${BASE}/dashboard`)
  await sleep(1500)
  const h1Nav = await page.textContent('h1').catch(() => '')
  console.log(`✅ h1 after nav away+back: "${h1Nav}"`)
  await page.screenshot({ path: 'verify-p2-05-after-nav.png' })

  // ── STEP 8: Probe — /admin as borrower ────────────────
  console.log('\n🔍 Probe: /admin as borrower → should redirect ──')
  await page.goto(`${BASE}/admin`)
  await sleep(1000)
  const adminUrl = page.url()
  const wasRedirected = !adminUrl.includes('/admin') || adminUrl.includes('/login') || adminUrl.includes('/dashboard')
  console.log(`   URL after /admin attempt: ${adminUrl}`)
  console.log(`✅ Borrower redirected away from /admin: ${wasRedirected}`)
  await page.screenshot({ path: 'verify-p2-06-admin-redirect.png' })

  // ── STEP 9: Meta check ─────────────────────────────────
  console.log('\n── STEP 9: Status meta info ──')
  await page.goto(`${BASE}/dashboard`)
  await sleep(1500)
  const meta = await page.textContent('[class*="statusMeta"]').catch(() => '')
  console.log(`   Meta text: "${meta}"`)
  const hasCurrency = meta.includes('USD') || meta.includes('GBP')
  const hasTrack = meta.includes('SME') || meta.includes('Project') || meta.includes('Trade') || meta.includes('Acquisition')
  console.log(`✅ Track shown in meta: ${hasTrack}`)
  console.log(`✅ Currency shown in meta: ${hasCurrency}`)
  await page.screenshot({ path: 'verify-p2-07-meta.png' })

  // ── STEP 10: JS errors ────────────────────────────────
  console.log('\n── STEP 10: JS console errors ──')
  if (jsErrors.length === 0) {
    console.log('✅ Zero JS errors throughout session')
  } else {
    console.log(`⚠️  ${jsErrors.length} JS error(s):`)
    jsErrors.forEach(e => console.log('   ', e))
  }

  await browser.close()
  console.log('\n── Done. Screenshots saved to project root. ──')
}

run().catch(e => {
  console.error('\n❌ SCRIPT ERROR:', e.message)
  process.exit(1)
})

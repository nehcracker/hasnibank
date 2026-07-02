import { chromium } from 'playwright'

const BASE = 'http://localhost:5174'
const EMAIL = 'admin@hasnibank.com'
const PASSWORD = 'HaAdmin2026@!'

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const jsErrors = []

async function run() {
  const browser = await chromium.launch({ headless: false, slowMo: 60 })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  const networkErrors = []
  page.on('console', m => { if (m.type() === 'error') jsErrors.push(m.text()) })
  page.on('pageerror', e => jsErrors.push(e.message))
  page.on('response', async r => {
    if (r.url().includes('supabase') && r.status() >= 400) {
      try { networkErrors.push(r.status() + ' ' + r.url().split('?')[0].split('/v1/')[1] + ' → ' + await r.text()) } catch {}
    }
  })

  // ── STEP 1: Login as staff ──────────────────────────────
  console.log('\n── STEP 1: Login (staff role) ──')
  await page.goto(`${BASE}/login`)
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/(admin|dashboard)/, { timeout: 10000 })
  console.log(`✅ Logged in → ${page.url()}`)

  // ── STEP 2: Navigate to /admin ─────────────────────────
  console.log('\n── STEP 2: /admin list view ──')
  await page.goto(`${BASE}/admin`)
  await sleep(1500)
  const adminUrl = page.url()
  console.log(`   URL: ${adminUrl}`)
  const onAdmin = adminUrl.includes('/admin') && !adminUrl.includes('/login')
  console.log(`✅ Staff can access /admin: ${onAdmin}`)
  await page.screenshot({ path: 'verify-admin-01-list.png' })

  // ── STEP 3: Application list renders ──────────────────
  console.log('\n── STEP 3: Application list content ──')
  const bodyText = await page.textContent('body')
  const hasTable = bodyText.includes('Test Co Ltd') || bodyText.includes('SME')
  const hasDaysOpen = bodyText.includes('day') || bodyText.includes('Day')
  const hasApplicant = bodyText.includes('Borrower') || bodyText.includes('nehlmac4')
  console.log(`✅ Table has application row: ${hasTable}`)
  console.log(`   Days open column visible: ${hasDaysOpen}`)
  console.log(`   Applicant name/email visible: ${hasApplicant}`)
  await page.screenshot({ path: 'verify-admin-02-list-content.png' })

  // ── STEP 4: Click row → detail view ───────────────────
  console.log('\n── STEP 4: Click application row → detail ──')
  const row = page.locator('[class*="tableRow"]').first()
  const rowExists = await row.isVisible().catch(() => false)
  if (rowExists) {
    await row.click()
    await sleep(1000)
    const detailUrl = page.url()
    console.log(`   URL after click: ${detailUrl}`)
    const onDetail = detailUrl.includes('/admin/applications/')
    console.log(`✅ Navigated to detail view: ${onDetail}`)
    await page.screenshot({ path: 'verify-admin-03-detail.png' })
  } else {
    console.log('⚠️  No table rows found — skipping row click')
  }

  // ── STEP 5: Detail view content ───────────────────────
  console.log('\n── STEP 5: Detail view fields ──')
  const detailText = await page.textContent('body').catch(() => '')
  const hasSmeDetails = detailText.includes('Test Co Ltd') || detailText.includes('SME')
  const hasStageControl = detailText.includes('Advance Stage') || detailText.includes('stage') || detailText.includes('Stage')
  const hasBackLink = detailText.includes('All Applications') || detailText.includes('Back')
  console.log(`✅ Applicant / track details visible: ${hasSmeDetails}`)
  console.log(`✅ StageControl section visible: ${hasStageControl}`)
  console.log(`✅ Back link present: ${hasBackLink}`)
  await page.screenshot({ path: 'verify-admin-04-detail-content.png' })

  // ── STEP 6: Advance stage with StageControl ────────────
  console.log('\n── STEP 6: Advance stage via StageControl ──')
  const stageSelect = page.locator('[class*="stageSelect"]').first()
  const stageSelectExists = await stageSelect.isVisible().catch(() => false)
  if (stageSelectExists) {
    await stageSelect.selectOption('kyc_verification')
    await sleep(300)
    // Add an optional note
    const noteField = page.locator('[class*="noteField"]').first()
    const noteExists = await noteField.isVisible().catch(() => false)
    if (noteExists) await noteField.fill('Verification test — advancing to KYC.')
    // Click update button
    const updateBtn = page.locator('[class*="updateBtn"]').first()
    await updateBtn.click()
    await sleep(2000)
    const afterText = await page.textContent('body').catch(() => '')
    const showsKyc = afterText.includes('KYC') || afterText.includes('kyc')
    const showsSuccess = afterText.includes('Stage updated') || afterText.includes('updated') || afterText.includes('success')
    console.log(`✅ Stage updated to KYC Verification: ${showsKyc}`)
    console.log(`   Success message shown: ${showsSuccess}`)
    await page.screenshot({ path: 'verify-admin-05-stage-updated.png' })
  } else {
    console.log('⚠️  stageSelect not found — check StageControl renders')
    await page.screenshot({ path: 'verify-admin-05-no-stage-control.png' })
  }

  // ── STEP 7: Network errors summary ────────────────────
  console.log('\n── STEP 7: Network errors ──')
  if (networkErrors.length === 0) {
    console.log('✅ Zero Supabase errors')
  } else {
    console.log(`⚠️  ${networkErrors.length} Supabase error(s):`)
    networkErrors.forEach(e => console.log('  ', e))
  }

  // ── STEP 8: JS errors ─────────────────────────────────
  console.log('\n── STEP 8: JS console errors ──')
  if (jsErrors.length === 0) {
    console.log('✅ Zero JS errors')
  } else {
    console.log(`⚠️  ${jsErrors.length} JS error(s):`)
    jsErrors.forEach(e => console.log('  ', e))
  }

  await browser.close()
  console.log('\n── Done. Screenshots: verify-admin-01 → verify-admin-05 ──')
}

run().catch(e => {
  console.error('\n❌ SCRIPT ERROR:', e.message)
  process.exit(1)
})

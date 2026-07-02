import { chromium } from 'playwright'

const BASE = 'http://localhost:5173'
const EMAIL = 'nehlmac4@gmail.com'
const PASSWORD = 'Cashpoint789@!'
const UID = '1323ab0f-327e-4514-a002-7ecdfad73af5'

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const jsErrors = []

// helpers — label:has-text + adjacent sibling (no for/id in Field component)
const inp  = (page, lbl) => page.locator(`label:has-text("${lbl}") + input`)
const sel  = (page, lbl) => page.locator(`label:has-text("${lbl}") + select`)
const txt  = (page, lbl) => page.locator(`label:has-text("${lbl}") + textarea`)

async function getSupabaseApp() {
  const res = await fetch(
    `https://sxgugdrblmrwuijekosz.supabase.co/rest/v1/applications?applicant_id=eq.${UID}&select=*`,
    { headers: {
      apikey: 'sb_publishable_Ap19OGngsIWd5AkivwTcOQ_wEtR8s-Y',
      Authorization: 'Bearer sb_publishable_Ap19OGngsIWd5AkivwTcOQ_wEtR8s-Y',
    }}
  )
  return res.json()
}

async function fillSmeFields(page) {
  await inp(page, 'Business name').fill('Test Co Ltd')
  await sel(page, 'Business type').selectOption('private_limited')
  await inp(page, 'Country of registration').fill('Nigeria')
  await sel(page, 'Annual revenue').selectOption('100k-500k')
  await sel(page, 'Loan purpose').selectOption('working_capital')
  await inp(page, 'Amount sought').fill('250000')
  await page.locator('input[type="radio"][value="no"]').click()
  await txt(page, 'Business & use-of-funds description').fill(
    'Working capital to expand our supply chain operations in West Africa.'
  )
}

async function run() {
  const browser = await chromium.launch({ headless: false, slowMo: 60 })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()

  page.on('console', m => { if (m.type() === 'error') jsErrors.push(m.text()) })
  page.on('pageerror', e => jsErrors.push(e.message))

  // ── STEP 1: Login ──────────────────────────────────────────────
  console.log('\n── STEP 1: Login ──')
  await page.goto(`${BASE}/login`)
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard', { timeout: 10000 })
  console.log('✅ Logged in → /dashboard')

  // ── STEP 2: Entry point ────────────────────────────────────────
  console.log('\n── STEP 2: Entry point ──')
  await page.getByRole('button', { name: 'Start Application' }).waitFor({ timeout: 8000 })
  console.log(`✅ h1: "${await page.textContent('h1')}"`)
  console.log('✅ "Start Application" button visible')
  await page.screenshot({ path: 'verify-01-entry.png' })

  // ── STEP 3: Open wizard ────────────────────────────────────────
  console.log('\n── STEP 3: Click Start Application ──')
  await page.getByRole('button', { name: 'Start Application' }).click()
  await sleep(600)
  await page.screenshot({ path: 'verify-02-step1-track.png' })

  const cards = await page.locator('[class*="trackCard"]').count()
  console.log(`✅ Track cards rendered: ${cards}`)
  const nextBtn = page.getByRole('button', { name: 'Next' })
  console.log(`✅ Next disabled before selection: ${await nextBtn.isDisabled()}`)

  // ── STEP 4: Select SME Financing ──────────────────────────────
  console.log('\n── STEP 4: Select SME Financing ──')
  await page.locator('[class*="trackCard"]').first().click()
  await sleep(300)
  console.log(`✅ Selected state applied: ${await page.locator('[class*="selected"]').count() > 0}`)
  console.log(`✅ Next enabled: ${!(await nextBtn.isDisabled())}`)
  await page.screenshot({ path: 'verify-03-track-selected.png' })

  // ── STEP 5: To step 2 + validation probe ──────────────────────
  console.log('\n── STEP 5: Advance to SME fields ──')
  await nextBtn.click()
  await sleep(400)
  console.log(`✅ Step 2 heading: "${await page.textContent('h2').catch(() => '')}"`)

  console.log('\n🔍 Probe: Next on empty fields → validation errors')
  await nextBtn.click()
  await sleep(300)
  const errCount = await page.locator('[class*="errorMsg"]').count()
  console.log(`✅ ${errCount} validation errors shown`)
  await page.screenshot({ path: 'verify-04-validation.png' })

  // ── STEP 6: Fill fields ────────────────────────────────────────
  console.log('\n── STEP 6: Fill SME fields ──')
  await fillSmeFields(page)
  await sleep(300)
  await page.screenshot({ path: 'verify-05-fields-filled.png' })
  console.log('✅ All SME fields filled')

  // ── STEP 7: Review ────────────────────────────────────────────
  console.log('\n── STEP 7: Advance to Review ──')
  await nextBtn.click()
  await sleep(600)
  const step3Title = await page.textContent('h2').catch(() => '')
  console.log(`✅ Step 3 heading: "${step3Title}"`)

  const bodyText = await page.textContent('body')
  console.log(`✅ "Private Limited" in review: ${bodyText.includes('Private Limited')}`)
  console.log(`✅ "Working Capital" in review:  ${bodyText.includes('Working Capital')}`)
  console.log(`✅ "250,000" in review:          ${bodyText.includes('250,000')}`)
  await page.screenshot({ path: 'verify-06-review.png' })

  // ── STEP 8: Edit track navigation ─────────────────────────────
  console.log('\n── STEP 8: Edit track → back to step 1 ──')
  await page.getByRole('button', { name: /Edit track/i }).click()
  await sleep(400)
  console.log(`✅ h2 after edit: "${await page.textContent('h2').catch(() => '')}"`)

  // Re-select and re-fill
  await page.locator('[class*="trackCard"]').first().click()
  await nextBtn.click()
  await sleep(400)
  await fillSmeFields(page)
  await nextBtn.click()
  await sleep(600)

  // ── STEP 9: Submit ────────────────────────────────────────────
  console.log('\n── STEP 9: Submit ──')
  const submitBtn = page.getByRole('button', { name: 'Submit Application' })
  console.log(`✅ Submit button visible: ${await submitBtn.isVisible()}`)
  await submitBtn.click()

  await page.waitForSelector('h1:has-text("Application Submitted")', { timeout: 12000 })
  const confirm = await page.textContent('body')
  console.log(`✅ "Application Submitted" heading shown`)
  console.log(`✅ Track "SME Financing" shown: ${confirm.includes('SME Financing')}`)
  console.log(`✅ Amount "250,000" shown:      ${confirm.includes('250,000')}`)
  await page.screenshot({ path: 'verify-07-submitted.png' })

  // ── STEP 10: Supabase row ─────────────────────────────────────
  console.log('\n── STEP 10: Verify Supabase row ──')
  await sleep(1000)
  const rows = await getSupabaseApp()
  if (rows?.length > 0) {
    const app = rows[0]
    console.log(`✅ Row in Supabase: track=${app.track} amount=${app.amount_sought} status=${app.status} currency=${app.currency}`)
    console.log(`   fields keys: ${Object.keys(app.fields || {}).join(', ')}`)
  } else {
    console.log('❌ No row in Supabase — INSERT failed')
  }

  // ── STEP 11: Refresh ──────────────────────────────────────────
  console.log('\n── STEP 11: Refresh → persisted ──')
  await page.reload()
  await page.waitForLoadState('networkidle')
  await sleep(1200)
  console.log(`✅ h1 after refresh: "${await page.textContent('h1').catch(() => '')}"`)
  await page.screenshot({ path: 'verify-08-after-refresh.png' })

  // 🔍 Probe: navigate away and back
  console.log('\n🔍 Probe: nav away then back → still submitted')
  await page.goto(`${BASE}/`)
  await sleep(600)
  await page.goto(`${BASE}/dashboard`)
  await sleep(1200)
  console.log(`✅ h1 after nav away+back: "${await page.textContent('h1').catch(() => '')}"`)
  await page.screenshot({ path: 'verify-09-after-nav.png' })

  // ── STEP 12: JS errors ────────────────────────────────────────
  console.log('\n── STEP 12: JS console errors ──')
  if (jsErrors.length === 0) {
    console.log('✅ Zero JS errors throughout session')
  } else {
    console.log(`⚠️  ${jsErrors.length} JS error(s):`)
    jsErrors.forEach(e => console.log('  ', e))
  }

  await browser.close()
  console.log('\n── Done. Screenshots in project root. ──')
}

run().catch(e => {
  console.error('\n❌ SCRIPT ERROR:', e.message)
  console.error(e.stack)
  process.exit(1)
})

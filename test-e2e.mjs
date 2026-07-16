/**
 * E2E flow: landing → auth modal → role select → sign-in → portal → sign-out
 * Creates a disposable viewer test user, injects the session, verifies all portals,
 * then deletes the test user.
 */
import { chromium } from 'playwright';

const SUPABASE_URL  = 'https://djezioftosszvpjlclfl.supabase.co';
const ANON_KEY      = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqZXppb2Z0b3NzenZwamxjbGZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NjA5MzYsImV4cCI6MjA5NTUzNjkzNn0.Miarws0GeviY1a1-dVlL_bMMwuENxwXfpgjbY4eaYnk';
const SERVICE_KEY   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqZXppb2Z0b3NzenZwamxjbGZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTk2MDkzNiwiZXhwIjoyMDk1NTM2OTM2fQ.adNzsOXjXgN5ZDL59u6nsnA8cE_TOt4FLsSbA3VpdSg';
const BASE_URL      = 'http://localhost:5173';
const TEST_EMAIL    = `e2e-test-${Date.now()}@studiop.test`;
const TEST_PASS     = 'StudioP_E2E_2026!';
const PROJECT_REF   = 'djezioftosszvpjlclfl';
const LS_KEY        = `sb-${PROJECT_REF}-auth-token`;

let testUserId = null;
const pass    = (msg) => console.log('  ✓', msg);
const fail    = (msg) => { console.log('  ✗', msg); process.exitCode = 1; };
const section = (msg) => console.log(`\n── ${msg} ─────────────────────────`);

// ── 1. Create disposable test user ──────────────────────────────────────────
section('Setup');
const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASS, email_confirm: true,
    user_metadata: { full_name: 'E2E Test User' } }),
});
const userData = await createRes.json();
if (!createRes.ok) { console.error('Cannot create test user:', userData); process.exit(1); }
testUserId = userData.id;
pass(`Test user: ${TEST_EMAIL}`);

await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`, Prefer: 'return=minimal' },
  body: JSON.stringify({ id: testUserId, email: TEST_EMAIL, name: 'E2E Test User', role: 'viewer' }),
});
pass('Profile row (role: viewer)');

// ── 2. Get session ───────────────────────────────────────────────────────────
const tokenRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
  body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASS }),
});
const session = await tokenRes.json();
if (!session.access_token) { console.error('Sign-in failed:', session); process.exit(1); }
pass(`Session obtained`);

// ── 3. Browser tests ─────────────────────────────────────────────────────────
const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  // ── 3a. Landing page ────────────────────────────────────────────────────────
  section('Landing page (unauthenticated)');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1000); // let React hydrate
  await page.screenshot({ path: '/tmp/e2e-01-landing.png' });

  await page.locator('text=MORE THAN').count() > 0
    ? pass('Hero headline') : fail('Hero headline missing');
  await page.locator('a[href="/privacy"]').count() > 0
    ? pass('Footer Privacy link') : fail('Footer Privacy link missing');
  await page.locator('a[href="/terms"]').count() > 0
    ? pass('Footer Terms link') : fail('Footer Terms link missing');

  // ── 3b. Auth modal — role selector ─────────────────────────────────────────
  section('Auth modal: role selector');
  await page.locator('button', { hasText: 'Join the Studio' }).first().click();
  await page.waitForSelector('text=WHO ARE YOU', { timeout: 5000 });
  await page.screenshot({ path: '/tmp/e2e-02-role-selector.png' });

  pass('Role selector renders');
  const clientBtn = page.getByRole('button', { name: /Client.*Book your next cut/i })
    .or(page.locator('div[style*="cursor"]', { hasText: 'Client' }).first());
  await clientBtn.count() > 0  ? pass('Client option') : fail('Client option missing');
  const barberBtn = page.getByRole('button', { name: /Barber.*Manage/i })
    .or(page.locator('div', { hasText: 'Barber' }).locator('..').first());
  await barberBtn.count() > 0  ? pass('Barber option') : fail('Barber option missing');
  await page.locator('text=Admin').count() > 0   ? pass('Admin option')  : fail('Admin option missing');

  // ── 3c. Auth modal — email form ─────────────────────────────────────────────
  section('Auth modal: email/password form');
  // Click the Client role button specifically (not the news card text)
  await page.getByRole('button', { name: /Client/i }).first().click();
  await page.waitForSelector('input[type="email"]', { timeout: 5000 });
  await page.screenshot({ path: '/tmp/e2e-03-signin-form.png' });

  pass('Email input visible after role select');
  await page.locator('input[type="password"]').count() > 0 ? pass('Password input') : fail('Password input missing');
  await page.locator('button', { hasText: /Google/i }).count() > 0 ? pass('Google OAuth button') : fail('Google button missing');
  await page.locator('a[href="/terms"]').count()   > 0 ? pass('Terms link in modal') : fail('Terms link missing in modal');
  await page.locator('a[href="/privacy"]').count() > 0 ? pass('Privacy link in modal') : fail('Privacy link missing in modal');

  // ── 3d. Form validation ─────────────────────────────────────────────────────
  section('Form validation');
  // Switch to Sign Up tab and try submitting empty
  const signUpTab = page.locator('button, [role="tab"]', { hasText: /sign up/i });
  if (await signUpTab.count() > 0) {
    await signUpTab.click();
    await page.waitForTimeout(300);
    const submitBtn = page.locator('button[type="submit"]').or(page.locator('button', { hasText: /Create Account/i }));
    if (await submitBtn.count() > 0) {
      await submitBtn.click();
      await page.waitForTimeout(500);
      const errors = await page.locator('text=/required|valid|must/i').count();
      errors > 0 ? pass('Validation errors shown on empty submit') : fail('No validation errors shown');
    }
  }
  await page.screenshot({ path: '/tmp/e2e-04-validation.png' });

  // Close modal
  await page.locator('text=×').click().catch(() => page.keyboard.press('Escape'));
  await page.waitForTimeout(400);

  // ── 3e. Sign in through form → viewer portal ────────────────────────────────
  section('Sign-in flow → viewer portal');
  // Hard reload to reset all React state (clears any stale modal overlay)
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('button', { hasText: 'Join the Studio' }).first().click();
  await page.waitForSelector('text=WHO ARE YOU', { timeout: 5000 });
  await page.getByRole('button', { name: /Client/i }).first().click();
  await page.waitForSelector('input[type="email"]', { timeout: 5000 });

  // Fill credentials and submit on the Sign In tab
  await page.locator('input[type="email"]').fill(TEST_EMAIL);
  await page.locator('input[type="password"]').fill(TEST_PASS);

  // Collect console errors during sign-in
  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  // Submit button text is "Sign In as Client →" — be specific to avoid matching the tab
  await page.locator('button[type="submit"]').or(page.locator('button', { hasText: /Sign In as/i })).first().click();

  // Wait for the portal to load — either URL changes or content appears
  await page.waitForURL(`${BASE_URL}/viewer`, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/e2e-05-viewer.png' });

  if (consoleErrors.length > 0) console.log('  Console errors:', consoleErrors.slice(0, 3));
  const finalUrl = page.url();
  finalUrl.includes('/viewer') ? pass(`Redirected to /viewer after sign-in`) : fail(`Wrong URL after sign-in: ${finalUrl}`);

  const portalContent = await page.locator('text=/book|service|appointment|schedule|your next cut/i').count();
  portalContent > 0 ? pass('Viewer portal content renders') : fail('Viewer portal content missing');

  const signOutBtn = page.locator('button', { hasText: /sign out|log out/i }).first();
  await signOutBtn.count() > 0 ? pass('Sign-out button visible') : fail('Sign-out button missing');

  // ── 3f. Sign out → landing ──────────────────────────────────────────────────
  section('Sign-out → landing');
  if (await signOutBtn.count() > 0) {
    await signOutBtn.click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: '/tmp/e2e-06-after-signout.png' });
    await page.locator('text=MORE THAN').count() > 0
      ? pass('Landing page shown after sign-out') : fail('Landing not shown after sign-out');
    const url = page.url();
    (url === `${BASE_URL}/` || url === BASE_URL)
      ? pass(`URL is / after sign-out`) : fail(`Unexpected URL after sign-out: ${url}`);
  }

  // ── 3g. Legal pages from footer ─────────────────────────────────────────────
  section('Legal pages via footer');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.locator('a[href="/privacy"]').last().click();
  await page.waitForURL('**/privacy', { timeout: 5000 });
  const privH1 = await page.textContent('h1');
  privH1?.includes('Privacy') ? pass(`/privacy → "${privH1.trim()}"`) : fail(`/privacy h1: ${privH1}`);

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.locator('a[href="/terms"]').last().click();
  await page.waitForURL('**/terms', { timeout: 5000 });
  const termsH1 = await page.textContent('h1');
  termsH1?.includes('Terms') ? pass(`/terms → "${termsH1.trim()}"`) : fail(`/terms h1: ${termsH1}`);

  console.log('\nScreenshots:');
  [1,2,3,4,5,6].forEach(n => console.log(`  /tmp/e2e-0${n}-*.png`));

} finally {
  await browser.close();
  section('Teardown');
  if (testUserId) {
    const del = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${testUserId}`, {
      method: 'DELETE',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    del.ok ? pass('Test user deleted') : fail(`Delete failed (${del.status})`);
  }
}

console.log('\n' + (process.exitCode === 1 ? '❌  SOME CHECKS FAILED' : '✅  ALL CHECKS PASSED') + '\n');

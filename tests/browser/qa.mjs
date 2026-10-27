// Frozen browser and accessibility checks for the built site (owner-owned).
// Phone and desktop: loads cleanly, no horizontal overflow, Tab reaches every
// link and button (the call to action included) with a visible focus
// indicator, no animation runs when reduced motion is requested, and axe
// finds no WCAG 2.1 AA violations. CI serves the built site and runs: node tests/browser/qa.mjs URL
import assert from 'node:assert/strict';
import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const target = process.argv[2] ?? 'http://127.0.0.1:8000/';
const deadline = Date.now() + 15000;
let ready = false;
while (Date.now() < deadline && !ready) {
  try {
    ready = (await fetch(target, { signal: AbortSignal.timeout(500) })).ok;
  } catch { /* bounded readiness, no success inferred */ }
  if (!ready) await new Promise(resolve => setTimeout(resolve, 100));
}
assert(ready, 'site not served within 15 seconds');

await mkdir('qa-artifacts', { recursive: true });
const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
const receipts = [];
try {
  for (const [name, width, height] of [['desktop', 1440, 1000], ['phone', 390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', () => errors.push('page error'));
    page.on('response', r => { if (r.status() >= 400) errors.push('asset ' + r.status()); });
    await page.goto(target, { waitUntil: 'networkidle', timeout: 10000 });
    assert.ok((await page.title()).trim(), name + ': the page needs a title');
    assert.equal(await page.evaluate(() =>
      document.documentElement.scrollWidth <= innerWidth), true, name + ': horizontal overflow');
    // Keyboard journey: Tab through every focusable element, in order.
    const focusable = await page.evaluate(() => {
      const all = document.querySelectorAll(
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      all.forEach((el, i) => { el.dataset.qaIndex = String(i); });
      return all.length;
    });
    assert.ok(focusable > 0, name + ': nothing to reach by keyboard');
    const reached = new Set();
    for (let i = 0; i < focusable + 2; i++) {
      await page.keyboard.press('Tab');
      const step = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const style = getComputedStyle(el);
        const ring = (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0)
          || style.boxShadow !== 'none';
        return { key: el.dataset.qaIndex, html: el.outerHTML.slice(0, 120),
          cta: el.classList.contains('cta'), ring };
      });
      if (step) {
        assert.ok(step.ring, name + ': no visible focus on ' + step.html);
        reached.add(step.key);
        if (step.cta) reached.add('cta');
      }
    }
    for (let i = 0; i < focusable; i++) {
      assert.ok(reached.has(String(i)), name + ': Tab does not reach every link and button');
    }
    assert.ok(reached.has('cta'), name + ': Tab never reaches the call to action');
    // Reduced motion: the page itself must stop animating, not just the browser.
    assert.equal(await page.evaluate(() =>
      matchMedia('(prefers-reduced-motion: reduce)').matches), true);
    const moving = await page.evaluate(() => [...document.querySelectorAll('*')].filter(el => {
      const style = getComputedStyle(el);
      return style.animationName !== 'none' && parseFloat(style.animationDuration) > 0.01;
    }).length);
    assert.equal(moving, 0, name + ': animations run under reduced motion');
    // What a screen reader user meets (accessibility is the main success
    // criterion; axe alone is not enough): heading levels never skip, and no
    // visible text is hidden from assistive technology.
    const levels = await page.evaluate(() =>
      [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].map(h => Number(h.tagName[1])));
    for (let i = 1; i < levels.length; i++) {
      assert.ok(levels[i] <= levels[i - 1] + 1,
        `${name}: heading levels skip from h${levels[i - 1]} to h${levels[i]}`);
    }
    const spoken = (await page.locator('body').ariaSnapshot()).toLowerCase();
    const shown = await page.evaluate(() => document.body.innerText.split('\n')
      .map(t => t.trim().toLowerCase()).filter(t => /[a-z0-9]/.test(t)));
    for (const text of shown) {
      const words = text.split(/\s+/).slice(0, 4).join(' ');
      if (!spoken.includes(words)) {
        console.log(`axe: hidden-from-screen-readers (serious) ${name} "${words}"`);
      }
      assert.ok(spoken.includes(words), `${name}: "${words}" is shown but hidden from screen readers`);
    }
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    const violations = axe.violations.map(v => `${v.id} (${v.impact})`);
    // One line per failing element, so whoever fixes it knows where and by
    // how much: the rule, viewport, element and, for contrast, the colours.
    for (const v of axe.violations) {
      for (const node of v.nodes.slice(0, 5)) {
        const data = (node.any.find(c => c.data && c.data.fgColor) || {}).data;
        const measured = data ? `: ${data.fgColor} on ${data.bgColor}, ${data.contrastRatio}:1 (needs ${data.expectedContrastRatio})` : '';
        console.log(`axe: ${v.id} (${v.impact}) ${name} ${node.target.join(' ')}${measured}`);
      }
    }
    assert.deepEqual(violations, [], name + ': accessibility violations');
    assert.deepEqual(errors, [], name + ': load errors');
    await page.screenshot({ path: `qa-artifacts/${name}.png`, fullPage: true });
    receipts.push({ viewport: name, width, height, overflow: false, keyboard: true,
      focusable, reducedMotion: true, axeViolations: 0, loadErrors: 0 });
    await context.close();
  }
} finally {
  await browser.close();
}
const receipt = { schema: 'crew.site-browser-qa@1', browser: browser.version(), receipts };
await writeFile('qa-artifacts/receipt.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt));
if (process.env.GITHUB_STEP_SUMMARY) {
  const rows = receipts.map(r => `| ${r.viewport} | ${r.width}×${r.height} | none | none | yes | yes |`);
  await appendFile(process.env.GITHUB_STEP_SUMMARY, [
    '## Browser and accessibility QA', '',
    '| Viewport | Size | Overflow | axe WCAG 2.1 AA violations | Keyboard | Reduced motion |',
    '| --- | --- | --- | --- | --- | --- |', ...rows, ''].join('\n'));
}

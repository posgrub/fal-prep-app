// Walk the Texas SOS TAC portal: follow each subchapter F rule record link and save the text of its iframes
// (the Appian page renders the rule body and source note inside richTextFieldWithTables iframes).
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const OUT = 'C:/Users/posgr/AppData/Local/Temp/claude/scrape/tac';
const rules = JSON.parse(fs.readFileSync(OUT + '/index.json', 'utf8'));
const exe = 'C:/Users/posgr/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe';
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0 Safari/537.36' });
const only = process.argv[2];
for (const r of rules) {
  const n = r.rule.replace('§34.', '');
  if (only && only !== n) continue;
  const file = `${OUT}/34-${n}.json`;
  if (!only && fs.existsSync(file)) { console.log(n, 'cached'); continue; }
  try {
    await page.goto(r.href, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForFunction(() => document.querySelectorAll('iframe').length >= 1, null, { timeout: 60000 }).catch(() => {});
    // wait until at least one iframe has body text
    for (let i = 0; i < 20; i++) {
      const lens = await Promise.all(page.frames().slice(1).map(f => f.evaluate(() => document.body?.innerText?.length || 0).catch(() => 0)));
      if (lens.some(l => l > 20)) break;
      await page.waitForTimeout(1000);
    }
    await page.waitForTimeout(1500);
    const frames = [];
    for (const f of page.frames().slice(1)) {
      const t = await f.evaluate(() => document.body?.innerText || '').catch(() => '');
      const h = await f.evaluate(() => document.body?.innerHTML || '').catch(() => '');
      if (t.trim()) frames.push({ url: f.url(), text: t, html: h });
    }
    const summary = await page.evaluate(() => document.body.innerText);
    fs.writeFileSync(file, JSON.stringify({ rule: r.rule, title: r.title, href: r.href, summary, frames }, null, 2));
    console.log(n, r.title, '| frames:', frames.map(f => f.text.length).join(','));
  } catch (e) { console.log(n, 'FAILED', e.message.split('\n')[0]); }
}
await browser.close();

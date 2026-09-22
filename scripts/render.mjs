// Render JS pages in headless Chromium and dump main text. Usage: node render.mjs <out.txt> <url> [waitSelector]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const [out, url, sel] = process.argv.slice(2);
const exe = 'C:/Users/posgr/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe';
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36' });
await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
if (sel) await page.waitForSelector(sel, { timeout: 60000 }).catch(() => console.error('selector not found: ' + sel));
await page.waitForTimeout(Number(process.env.WAIT || 1500));
const text = await page.evaluate(() => document.body.innerText);
fs.writeFileSync(out, text);
console.log('saved', out, text.length, 'chars');
const links = await page.evaluate(() => Array.from(document.querySelectorAll('a')).map(a => a.href + ' | ' + a.innerText.trim().slice(0, 80)));
fs.writeFileSync(out + '.links', links.join('\n'));
await browser.close();

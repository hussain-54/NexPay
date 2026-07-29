#!/usr/bin/env node
/**
 * NexPay UI asset generator
 * Screenshots ui-ux/html/*.html → ui-ux/png/ (1080×2400)
 * Combines PNGs → ui-ux/pdf/Complete_UI_Mockups.pdf
 * Optionally exports hackathon SVGs to PNG (1920×1080)
 *
 * Usage: node scripts/generate-assets.mjs [--hackathon]
 * Uses: Playwright (channel chrome) → Puppeteer → system Chrome/Edge CLI
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const HTML_DIR = path.join(ROOT, 'ui-ux', 'html');
const PNG_DIR = path.join(ROOT, 'ui-ux', 'png');
const PDF_DIR = path.join(ROOT, 'ui-ux', 'pdf');
const HACK_DIR = path.join(ROOT, 'hackathon-assets');

const MOBILE = { width: 1080, height: 2400 };
const WIDE = { width: 1920, height: 1080 };

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function listHtmlMockups() {
  return fs
    .readdirSync(HTML_DIR)
    .filter((f) => f.endsWith('.html') && /^\d{2}_/.test(f))
    .sort();
}

function fileUrl(p) {
  const normalized = path.resolve(p).replace(/\\/g, '/');
  return normalized.startsWith('/') ? `file://${normalized}` : `file:///${normalized}`;
}

function findSystemBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);
  return candidates.find((c) => fs.existsSync(c)) || null;
}

async function loadBrowser() {
  // 1) Playwright with system Chrome channel (avoids downloading Chromium)
  try {
    const { chromium } = await import('playwright');
    for (const opts of [
      { channel: 'chrome', headless: true },
      { channel: 'msedge', headless: true },
      { executablePath: findSystemBrowser(), headless: true },
      { headless: true },
    ]) {
      if (opts.executablePath === null) continue;
      try {
        const browser = await chromium.launch(opts);
        return {
          name: 'playwright',
          browser,
          async close() { await browser.close(); },
          async newPage() { return browser.newPage(); },
        };
      } catch {
        /* try next */
      }
    }
  } catch {
    /* no playwright */
  }

  // 2) Puppeteer with system Chrome
  try {
    const puppeteer = await import('puppeteer-core');
    const exe = findSystemBrowser();
    if (exe) {
      const browser = await puppeteer.default.launch({
        headless: true,
        executablePath: exe,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      return {
        name: 'puppeteer',
        browser,
        async close() { await browser.close(); },
        async newPage() { return browser.newPage(); },
      };
    }
  } catch {
    /* try full puppeteer */
  }

  try {
    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    return {
      name: 'puppeteer',
      browser,
      async close() { await browser.close(); },
      async newPage() { return browser.newPage(); },
    };
  } catch {
    /* fall through */
  }

  // 3) CLI fallback
  const exe = findSystemBrowser();
  if (exe) {
    return { name: 'chrome-cli', exe, async close() {}, async newPage() { return null; } };
  }

  return null;
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function screenshotWithEngine(runtime, filePath, outPath, viewport) {
  if (runtime.name === 'chrome-cli') {
    ensureDir(path.dirname(outPath));
    const tmpDir = path.join(PNG_DIR, '_tmp_chrome');
    ensureDir(tmpDir);
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--window-size=${viewport.width},${viewport.height}`,
      `--screenshot=${outPath}`,
      fileUrl(filePath),
    ];
    const res = spawnSync(runtime.exe, args, { encoding: 'utf8', timeout: 60000 });
    if (!fs.existsSync(outPath)) {
      throw new Error(`Chrome CLI screenshot failed: ${res.stderr || res.stdout || res.status}`);
    }
    return;
  }

  const page = await runtime.newPage();
  try {
    if (runtime.name === 'playwright') {
      await page.setViewportSize(viewport);
    } else {
      await page.setViewport(viewport);
    }
    const waitUntil = runtime.name === 'playwright' ? 'load' : 'networkidle0';
    await page.goto(fileUrl(filePath), { waitUntil, timeout: 60000 });
    await delay(900);
    await page.screenshot({ path: outPath, fullPage: false, type: 'png' });
  } finally {
    await page.close();
  }
}

async function buildPdfFromPngs(pngPaths, pdfPath) {
  try {
    const PDFDocument = (await import('pdf-lib')).PDFDocument;
    const pdf = await PDFDocument.create();
    for (const pngPath of pngPaths) {
      const bytes = fs.readFileSync(pngPath);
      const img = await pdf.embedPng(bytes);
      const page = pdf.addPage([MOBILE.width, MOBILE.height]);
      page.drawImage(img, { x: 0, y: 0, width: MOBILE.width, height: MOBILE.height });
    }
    fs.writeFileSync(pdfPath, await pdf.save());
    return true;
  } catch (e) {
    console.warn('pdf-lib failed:', e.message);
    return false;
  }
}

async function main() {
  const hackathon = process.argv.includes('--hackathon');
  ensureDir(PNG_DIR);
  ensureDir(PDF_DIR);

  const runtime = await loadBrowser();
  if (!runtime) {
    console.error(`
NexPay generate-assets: no browser found.

Install Chrome/Edge, or:
  npm install -D playwright && npx playwright install chromium
  npm install -D pdf-lib
`);
    process.exit(1);
  }

  console.log(`Using ${runtime.name}${runtime.exe ? ` (${runtime.exe})` : ''}`);

  const htmlFiles = listHtmlMockups();
  const pngPaths = [];

  for (const file of htmlFiles) {
    const htmlPath = path.join(HTML_DIR, file);
    const pngName = file.replace('.html', '.png');
    const pngPath = path.join(PNG_DIR, pngName);
    await screenshotWithEngine(runtime, htmlPath, pngPath, MOBILE);
    pngPaths.push(pngPath);
    console.log('PNG', pngName);
  }

  const pdfPath = path.join(PDF_DIR, 'Complete_UI_Mockups.pdf');
  if (await buildPdfFromPngs(pngPaths, pdfPath)) {
    console.log('PDF', pdfPath);
  } else {
    console.warn('PDF not created — ensure pdf-lib is installed');
  }

  if (hackathon) {
    const svgFiles = fs.readdirSync(HACK_DIR).filter((f) => f.endsWith('.svg'));
    for (const file of svgFiles) {
      const svgPath = path.join(HACK_DIR, file);
      const pngPath = path.join(HACK_DIR, file.replace('.svg', '.png'));
      // Wrap SVG in HTML for consistent viewport capture
      const wrap = path.join(HACK_DIR, `_wrap_${file}.html`);
      fs.writeFileSync(
        wrap,
        `<!DOCTYPE html><html><head><style>*{margin:0;padding:0}html,body{width:1920px;height:1080px;overflow:hidden;background:#05050A}img,object,svg{width:1920px;height:1080px;display:block}</style></head><body>${fs.readFileSync(svgPath, 'utf8')}</body></html>`
      );
      try {
        await screenshotWithEngine(runtime, wrap, pngPath, WIDE);
        console.log('Hackathon PNG', file.replace('.svg', '.png'));
      } finally {
        fs.unlinkSync(wrap);
      }
    }
  }

  await runtime.close();
  console.log(`Done. ${pngPaths.length} mockup PNGs → ${PNG_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

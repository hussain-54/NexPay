# NexPay UI mockups — PNG export

PNG screenshots are **not committed** by default (large binaries). Generate them locally:

```bash
npm install -D playwright
npx playwright install chromium
node scripts/generate-assets.mjs
```

Output: one PNG per screen (`01_welcome.png` … `28_splash.png`) at **1080×2400**, matching the HTML viewport.

Alternative: `npm install -D puppeteer` (same script auto-detects the engine).

Optional hackathon widescreen exports:

```bash
node scripts/generate-assets.mjs --hackathon
```

Writes matching `.png` files next to each SVG in `hackathon-assets/`.

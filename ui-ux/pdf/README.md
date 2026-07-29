# NexPay UI mockups — PDF

Run the asset generator to build **`Complete_UI_Mockups.pdf`** (all 28 screens, one page per mockup at 1080×2400):

```bash
npm install -D playwright
npx playwright install chromium
node scripts/generate-assets.mjs
```

The PDF is written to this folder after PNGs are captured. If Playwright PDF export fails, install **`pdf-lib`** as a fallback:

```bash
npm install -D pdf-lib
node scripts/generate-assets.mjs
```

Source of truth for visuals: `../html/*.html` (self-contained, embedded CSS).

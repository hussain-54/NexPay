# NexPay UI/UX Deliverables

## Structure

```
ui-ux/
  html/           # 28 responsive HTML mockups (App Store quality)
  png/            # 1080×2400 PNG exports
  pdf/            # Complete_UI_Mockups.pdf
  design-system/  # Colors, typography, components docs
hackathon-assets/ # Presentation SVGs + PNGs (1920×1080)
```

## Regenerate PNG / PDF

```bash
node scripts/generate-assets.mjs --hackathon
```

Uses system Chrome via Playwright when available.

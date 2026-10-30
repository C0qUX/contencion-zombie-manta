const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const path = require('node:path')
// Exporta docs/presentacion.html a PDF: una página de 1920×1080 por diapositiva, según su @page.
;(async () => {
  const source = path.resolve(process.env.DECK_HTML || 'docs/presentacion.html')
  const target = path.resolve(process.env.DECK_PDF || 'docs/presentacion.pdf')
  const browser = await chromium.launch({ headless: true, channel: process.env.UI_BROWSER_CHANNEL || undefined })
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
    await page.goto('file://' + source, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    await page.pdf({ path: target, width: '1920px', height: '1080px', printBackground: true, preferCSSPageSize: true })
    console.log('PDF generado:', target)
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exit(1) })

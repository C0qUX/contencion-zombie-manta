// Optional browser acceptance check. Uses an existing Playwright installation;
// no product dependency or lockfile changes are required.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')

async function verify() {
  const output = path.resolve(process.env.UI_EVIDENCE_DIR || 'docs/evidencia-ui')
  await fs.mkdir(output, { recursive: true })
  const browser = await chromium.launch({ headless: true, channel: process.env.UI_BROWSER_CHANNEL || undefined })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
  const errors = []
  const checks = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => {
    window.__results = []
    window.__progress = []
    window.__requests = []
    const NativeWorker = window.Worker
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args)
        this.addEventListener('message', ({ data }) => {
          if (data.type === 'result') window.__results.push(data.result)
          if (data.type === 'progress') window.__progress.push(data.progress)
        })
      }
      postMessage(data) {
        if (window.__corruptNext) {
          data = structuredClone(data)
          data.config.initialInfected = data.config.population
          data.config.initialZone = 'market'
          window.__corruptNext = false
        }
        window.__requests.push(data)
        return super.postMessage(data)
      }
    }
  })
  try {
    await page.goto(process.env.UI_BASE_URL || 'http://127.0.0.1:4173')
    await page.waitForLoadState('networkidle')
    assert.equal(await page.title(), '7DaysToSurvive | Sala de mando')
    assert.equal(await page.locator('input[name=population]').inputValue(), '400')
    const run = () => page.getByRole('button', { name: 'Ejecutar simulación' }).click()
    const waitResults = count => page.waitForFunction(count => window.__results.length === count, count, { timeout: 60000 })
    const latest = () => page.evaluate(() => window.__results.at(-1))
    const fill = (key, value) => page.locator(`[name="${key}"]`).fill(String(value))
    const setDay = async day => {
      const slider = page.getByRole('slider', { name: 'Día ilustrado' })
      await slider.focus()
      await slider.press('Home')
      for (let i = 0; i < day; i++) await slider.press('ArrowRight')
    }
    await run()
    await waitResults(1)
    await page.getByRole('heading', { name: 'Comparar el brote' }).waitFor()
    const defaultResult = await latest()
    assert.equal(defaultResult.config.seed, 2026)
    assert.equal(defaultResult.example.repetition, 0)
    assert.equal(await page.locator('.curve').count(), 3)
    assert.equal(await page.locator('.confidence-band').count(), 3)
    assert.equal(await page.locator('.person').count(), 400)
    assert.ok(await page.evaluate(() => window.__progress.length > 0))
    await page.screenshot({ path: path.join(output, 'escritorio.png'), fullPage: true })
    checks.push('Default: motor real, progreso, tres curvas/bandas, red de repetición 0')

    await page.locator('.advanced summary').click()
    await fill('seed', 87)
    assert.ok(await page.locator('.pending-banner').isVisible())
    assert.match(await page.locator('.applied-config').innerText(), /2026/)
    assert.equal(await page.evaluate(() => window.__requests.length), 1)
    await run()
    await waitResults(2)
    const seeded = await latest()
    await run()
    await waitResults(3)
    assert.deepEqual(await latest(), seeded)
    checks.push('Semilla 87 repetida: resultado completo idéntico; edición no ejecuta ni relabela resultados anteriores')

    const positions = await page.locator('.person').evaluateAll(nodes => nodes.map(node => node.innerHTML.replace(/<title>.*?<\/title>/, '')))
    await setDay(10)
    await page.getByLabel('Estrategia ilustrada').selectOption('none')
    assert.equal(await page.locator('.day-control output').innerText(), '10')
    await page.getByRole('button', { name: 'Reproducir animación' }).click()
    await page.waitForFunction(() => Number(document.querySelector('.day-control output').textContent) > 10)
    await page.getByRole('button', { name: 'Pausar animación' }).click()
    const pausedDay = await page.locator('.day-control output').innerText()
    await page.waitForTimeout(800)
    assert.equal(await page.locator('.day-control output').innerText(), pausedDay)
    await setDay(0)
    await page.getByLabel('Estrategia ilustrada').selectOption('targeted')
    assert.deepEqual(await page.locator('.person').evaluateAll(nodes => nodes.map(node => node.innerHTML.replace(/<title>.*?<\/title>/, ''))), positions)
    checks.push('Red: selector de día/estrategia, posiciones estables, reproducción y pausa')

    await page.getByRole('button', { name: 'Contagio ×2' }).click()
    assert.equal(await page.locator('[name=transmissionProbability]').inputValue(), '0.16')
    await page.getByRole('button', { name: 'Mitad de antídotos' }).click()
    await page.getByRole('button', { name: 'Mitad de antídotos' }).click()
    assert.equal(await page.locator('[name=totalVaccines]').inputValue(), '20')
    assert.equal(await page.locator('[name=vaccinesPerDay]').inputValue(), '20')
    await page.getByRole('button', { name: 'Paciente cero en el mercado' }).click()
    await page.getByRole('button', { name: 'Variante: eficacia 50 %' }).click()
    assert.equal(await page.locator('[name=initialZone]').inputValue(), 'market')
    assert.equal(await page.locator('[name=vaccineEfficacy]').inputValue(), '0.5')
    assert.equal(await page.locator('[name=initialInfected]').inputValue(), '1')
    assert.equal(await page.evaluate(() => window.__requests.length), 3)
    await page.getByRole('button', { name: 'Restablecer valores iniciales' }).click()
    await fill('totalVaccines', 0)
    await run()
    await waitResults(4)
    const zero = await latest()
    assert.equal(zero.strategies.random.dosesUsed.max, 0)
    assert.equal(zero.strategies.targeted.dosesUsed.max, 0)
    assert.equal(zero.avoidedVsRandom.mean, 0)
    assert.match(await page.locator('.recommendation').innerText(), /empatan/)
    checks.push('Cuatro sorpresas acumulativas, reset, cero stock y recomendación de empate')

    const beforeInvalid = await page.evaluate(() => window.__requests.length)
    await fill('seed', '')
    await run()
    assert.ok(await page.locator('#seed-error').isVisible())
    assert.equal(await page.locator('[name=seed]').inputValue(), '')
    await fill('seed', 4294967296)
    await run()
    assert.ok(await page.locator('#seed-error').isVisible())
    await fill('seed', 87)
    await fill('initialInfected', 400)
    await run()
    assert.ok(await page.locator('#initialInfected-error').isVisible())
    assert.equal(await page.evaluate(() => window.__requests.length), beforeInvalid)
    checks.push('UI rechaza blanco, semilla fuera de uint32 y exceso de infectados en zona sin iniciar Worker')

    await page.getByRole('button', { name: 'Restablecer valores iniciales' }).click()
    await page.evaluate(() => { window.__corruptNext = true })
    await run()
    await page.locator('.error-banner').waitFor()
    assert.match(await page.locator('.error-banner').innerText(), /candidatos/)
    assert.equal((await latest()).config.totalVaccines, 0)
    checks.push('Error real del motor se muestra y conserva el resultado previo')

    await fill('population', 1000)
    await fill('days', 60)
    await fill('repetitions', 200)
    await fill('transmissionProbability', 1)
    await fill('recoveryProbability', 0.01)
    await run()
    await fill('vaccinesPerDay', 19)
    assert.ok(await page.getByText('Cambiaste el escenario durante la ejecución.', { exact: false }).isVisible())
    await page.getByRole('button', { name: 'Cancelar ejecución' }).click()
    assert.match(await page.locator('.run-status').innerText(), /cancelada/)
    assert.equal(await page.locator('[name=vaccinesPerDay]').inputValue(), '19')
    await page.getByRole('button', { name: 'Restablecer valores iniciales' }).click()
    await run()
    await waitResults(5)
    assert.deepEqual(await latest(), defaultResult)
    checks.push('Worker pesado: controles responden, captura configuración, cancela y reejecuta desde cero')

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportar JSON' }).click()
    const download = await downloadPromise
    const exported = JSON.parse(await fs.readFile(await download.path(), 'utf8'))
    assert.deepEqual(exported.result, defaultResult)
    assert.deepEqual(exported.config, defaultResult.config)
    checks.push('JSON descargado reproduce config y resultado completos')

    // A naturally losing seed is used only to verify negative rendering, never
    // to pick the example or defaults shown to users.
    await fill('population', 50)
    await fill('repetitions', 1)
    await fill('totalVaccines', 10)
    await fill('vaccinesPerDay', 2)
    let losing
    let count = 5
    for (let seed = 0; seed < 30; seed++) {
      await fill('seed', seed)
      await run()
      await waitResults(++count)
      const result = await latest()
      if (result.avoidedVsRandom.mean < 0 || result.avoidedVsNone.mean < 0) { losing = result; break }
    }
    assert.ok(losing, 'Expected at least one naturally negative difference among seeds 0..29')
    assert.ok(await page.locator('.metrics .negative').count() > 0)
    assert.match(await page.locator('.recommendation').innerText(), /contagios más/)
    checks.push(`Diferencia negativa real conservada: población 50, repeticiones 1, stock 10, dosis/día 2, semilla ${losing.config.seed}`)

    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({ path: path.join(output, 'movil.png'), fullPage: true })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false)
    await page.keyboard.press('Control+Home')
    await page.locator('[name=population]').focus()
    await page.keyboard.press('Tab')
    assert.equal(await page.evaluate(() => document.activeElement.name), 'days')
    assert.deepEqual(errors, [])
    checks.push('Vista 390 px sin desbordamiento de página; tabulación entre controles; sin errores JS')
    await fs.writeFile(path.join(output, 'verificacion.json'), JSON.stringify({ baseURL: process.env.UI_BASE_URL || 'http://127.0.0.1:4173', checks, pageErrors: errors, negativeScenario: losing.config }, null, 2))
    console.log(JSON.stringify({ passed: checks.length, checks, pageErrors: errors }, null, 2))
  } finally {
    await browser.close()
  }
}
verify().catch(error => { console.error(error); process.exitCode = 1 })

const fs = require('fs')
const path = require('path')
const puppeteer = require('puppeteer')
const { evaluateTemplate } = require('./widgets/widgets')
const log = require('./log')

const ssr = async (url, opts, req) => {
  const start = Date.now()

  const browser = await puppeteer.launch({
    headless: true,
    ignoreDefaultArgs: ['--disable-extensions'],
  })
  
  const page = await browser.newPage()

  // watch for console messages
  page
    .on('console', message => {
      switch (message.type().toLowerCase()) {
        case 'error':
          log.error(message.text())
          break
        case 'warn':
          log.warn(message.text())
          break
        case 'log':
          log.debug(message.text())
          break
        default:
          log.info(`${message.type()}: ${message.text()}`)
      }
    })
    .on('pageerror', ({ message }) => log.info("PAGE:", message))
    .on('request', request => {
      log.info(`PAGE: ${request.method()} ${request.url()}`)})
    .on('response', response =>
      log.info(`PAGE: ${response.status()} ${response.url()}`))
    .on('requestfailed', request =>
      log.info(`PAGE: ${request.failure().errorText} ${request.url()}`))
  try {
    const runningWithoutJs = req.url.startsWith('/html')

    // await page.setJavaScriptEnabled(false) // disable javascript, it'll run on the client
    // if (runningWithoutJs)
      await page.setJavaScriptEnabled(true) // ...unless the client disabled js, we'd ideally detect that
                                            // and redirect to the html version. this is just a demo though
                                            // so we'll need to change the url manually

    /*
    widgetApi: {
      enabled: true,
      path: path.join(__dirname, 'public/wapi.js'),
      req,
      widgetDataMap,
      widgetMetaMap
    }
    */
   let widgetApiEval = ""
   if (opts.widgetApi.enabled) {
      widgetApiEval = await evaluateTemplate(
        opts.widgetApi.path,
        req,
        opts.widgetApi.widgetDataMap,
        opts.widgetApi.widgetMetaMap
      )
      
      // if (runningWithoutJs) {
        await page.evaluateOnNewDocument(widgetApiEval)
      // }
    }
    await page.goto(url, {waitUntil: 'networkidle0'})

    if (!runningWithoutJs && opts.widgetApi.enabled)
      await page.addScriptTag({content: widgetApiEval})

    
    // Now, we need to load all widgets and inject their content
    if (opts.widgetApi.enabled) {
      const widgetContentMap = {}

      for (const widgetId of Object.keys(opts.widgetApi.widgetDataMap)) {
        const fileName = path.join(__dirname, 'widgets' + `/${widgetId}.html`)
        const widgetContent = fs.readFileSync(fileName).toString()

        widgetContentMap[widgetId] = {
          content: widgetContent,
          position: opts.widgetApi.widgetMetaMap[widgetId].config.position,
          size: opts.widgetApi.widgetMetaMap[widgetId].config.size
        }
      }

      await page.evaluate((widgetContentMap) => {
        for (const widgetId of Object.keys(widgetContentMap)) {
          let el = window.KagiWidgets.newSpaceForWidget(widgetId, widgetContentMap[widgetId].position, widgetContentMap[widgetId].size)
          el.innerHTML = widgetContentMap[widgetId].content
        }
      }, widgetContentMap)
    }

    if (opts.widgetApi.enabled) {
      try {
        await page.$$eval('.avocado', els => {
          for (const el of els) {
            // TODO: make this not hacky :c
            for (const child of el.children) {
              if (child.tagName === "SCRIPT") {
                // eval the script
                // we need to find a better way to do this
                eval(child.innerHTML)
              }
            }
          }
        })
      } catch (err) {
        // likely no avocado elements
        log.warn("No avocado elements found, skipping avocado eval")
      }

      let widgetLoadStart = Date.now()
      await page.evaluate(async (widgetCount, log) => {
        let i = 0
        while (window.KagiWidgets.__loadCount != widgetCount) {
          console.log("waiting for widgets to load")
          console.log(window.KagiWidgets.__loadCount)
          console.log(widgetCount)
          await new Promise(resolve => setTimeout(resolve, 1000))
          i++

          if (i > 2) { // kill it after 2 seconds
            console.warn("widgets took too long to load, skipping")
            break
          }
        }
      }, Object.keys(opts.widgetApi.widgetDataMap).length)

      log.info(`widgets loaded in ${Date.now() - widgetLoadStart}ms`)
    }

    if (runningWithoutJs)
      await page.$$eval('script', scripts => scripts.forEach(s => s.remove()))
  } catch (err) {
    log.error(err)
    throw err
  }

  if (opts.search.enabled) {
    const input = opts.search.query

    await page.$eval('#searchInput', (el, input) => {
      el.setAttribute('value', input)
    }, input)
  }

  const html = await page.content() // serialised HTML of page DOM
  await browser.close()

  const ttRenderMs = Date.now() - start
  log.info(`Headless rendered page in ${ttRenderMs}ms`)

  return {html, ttRenderMs}
}

module.exports = ssr
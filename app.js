const path = require('path')
const fastify = require('fastify')({ logger: false })
const { inspect } = require('util')
const metadataForWidget = require('./widgets/metadata')
const ssr = require('./ssr')
const log = require('./log')

fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, 'public')
})

// Purely for demo purposes
const enabledWidgets = [
  'com.julesnieves.espn',
  'com.julesnieves.interactive'
]

fastify.get('/', async (req, rep) => {
  rep.type('text/html')

  try {
    let { html } = await ssr(
      `${req.protocol}://${req.headers["host"]}/index.html`,
      {
        widgetApi: {
          enabled: false,
        },
        search: { enabled: false }
      },
      req
    )

    rep.send(html)
  } catch(err) {
    log.error(err)
    rep.send(err.toString())
  }
})

fastify.get('/api/widget/:widgetId', async (req, rep) => {

})

const searchHandler = async (req, rep) => {
  if (!req.query || !req.query.q) {
    rep.redirect('/')
    return
  }

  rep.type('text/html')

  try {
    /**
     {
      "<widgetId>": [
        {
         "type": "query|result",
         "content": <content>,
         "isGrouped": <boolean>
        },
        ...
      ],
      ...
     }

     content may be an array or an object. if the type is a result, it will
     be an object containing the result data (url, title, blurb, etc). if the
     type is a query, it will be an array of strings consistent with the
     String.prototype.matchAll() method. this includes the entire match, as
     well as any capturing groups.

     to recap:

     if query:
       object with result data
     if result:
       array of strings from String.prototype.matchAll()
     */
    let widgetDataMap = {}
    let widgetMetaMap = {}

    for (const widgetId of enabledWidgets) {
      const widget = metadataForWidget(path.join(__dirname, 'widgets', widgetId + '.html'))
      widgetMetaMap[widgetId] = widget
      
      if (!widget) {
        log.warn(`Widget ${widgetId} either does not exist or is outdated`)
        continue
      }

      widgetDataMap[widgetId] = [] // init an array, we'll prune empty ones later
      log.info("Widget", widgetId, "has metadata", inspect(widget, {depth: null}) )

      for (const trigger of widget.triggers) {
        const triggerName = trigger.toLowerCase().split(':')[0]
        switch (triggerName) {
          case 'search': {
            const regexStr = trigger.replace(/^search:/g, '')
            const flags = regexStr.replace(/^.*\//, '')
            const regex = new RegExp(
              regexStr
                .replace(/^\//, '')
                .replace(/\/.*$/, ''),
              flags.replace('g', '')
            )

            if (regex.test(req.query.q)) {
              // get all matches for this trigger
              const matches = regex.exec(req.query.q)
              if (!matches) continue

              widgetDataMap[widgetId].push({
                type: 'query',
                content: Array.from(matches),
                // if the trigger regex has capturing groups, it's grouped
                isGrouped: regexStr.includes('(') 
              })
            }
            break
          }
          case 'inresult': {
            // TODO: get results from search, then check if a url matches

            // const regex = trigger.replace(/^inresult:/g, '')
            break
          }
          default:
            log.warn(`Unknown trigger ${triggerName} for ${widgetId}`)
        }
      }
    }

    // prune empty arrays
    for (const widgetId in widgetDataMap) {
      if (widgetDataMap[widgetId].length === 0) {
        delete widgetDataMap[widgetId]
      }
    }

    log.info("Widget data map:", inspect(widgetDataMap, { depth: 3 }))

    let { html } = await ssr(
      `${req.protocol}://${req.headers["host"]}/index.html`,
      {
        widgetApi: {
          enabled: true,
          path: path.join(__dirname, 'public/wapi.js'),
          widgetDataMap,
          widgetMetaMap
        },
        search: { enabled: true, query: req.query.q }
      },
      req
    )

    rep.send(html)
  } catch(err) {
    log.error(err)
    rep.send(err.toString())
  }
}

fastify.register((ff, _, done) => {
  ff.get('/search', searchHandler)
  
  done()
})

fastify.register((ff, _, done) => {
  ff.get('/search', searchHandler)
  
  done()
}, { prefix: '/html' })

const start = async () => {
  try {
    console.clear()
    await fastify.listen({ port: 3000, host: '0.0.0.0' })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()

const fs = require('fs')

const templateOptions = [
  {
    "replace": /\[\[Query\]\]/g,
    "value": async (req, _widgetData, _widgetMeta) => {
      return `"${req.query["q"]}"`
    }
  },
  {
    "replace": /\[\[WidgetDataMap\]\]/g,
    "value": async (_req, widgetData, _widgetMeta) => {
      return JSON.stringify(widgetData)
    }
  }
]

const evaluateTemplate = async (template, req, widgetData, widgetMeta) => {
  let content = (await fs.promises.readFile(template)).toString()

  for (const option of templateOptions) {
    const value = await option.value(req, widgetData, widgetMeta)
    content = content.replace(option.replace, value)
  }

  // console.log(content)

  return content
}

module.exports = {
  evaluateTemplate
}

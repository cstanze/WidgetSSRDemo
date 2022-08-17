const reader = require('./reader')

// metadata version
// important to note that
// if the versions don't match,
// the widget should not be loaded
const version = "1.0"

module.exports = (file) => {
  let metaVersion = reader.content(file, 'Kagi.version')
  if (metaVersion !== version) return null

  let metaName = reader.content(file, 'Kagi.meta.name')
  let metaDescription = reader.content(file, 'Kagi.meta.description')
  let metaAuthor = reader.content(file, 'Kagi.meta.author')
  let metaId = reader.content(file, 'Kagi.meta.id')
  let metaCategory = reader.content(file, 'Kagi.meta.category')

  let configPosition = reader.content(file, 'Kagi.config.position')
  let configSize = reader.content(file, 'Kagi.config.size')

  let triggers = reader.list(file, 'Kagi.triggers') || []
  let permissions = reader.list(file, 'Kagi.permissions') || []

  return {
    version,
    meta: {
      name: metaName,
      description: metaDescription,
      author: metaAuthor,
      id: metaId,
      category: metaCategory
    },
    config: {
      position: configPosition,
      size: configSize
    },
    triggers,
    permissions
  }
}

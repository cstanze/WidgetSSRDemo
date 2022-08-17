window.KagiWidgets = {
  __loadCount: 0,
  _dataMap: [[WidgetDataMap]],
  
  matchedQueryGroup: (id, group) => {
    const data = window.KagiWidgets._dataMap[id]
    
    if (!data) return null
    
    return data
      .filter(d => d.type === 'query' && d.isGrouped) // get all grouped queries
      .filter(d => d.content.length > group) // filter out ones that don't have the group
      .map(d => d.content[group]) // get an array of group results 
                                  // (in the case of multiple queries with the same group index)
  },

  inResultMatches: (id) => {
    const data = window.KagiWidgets._dataMap[id]

    if (!data) return null

    return data
      .filter(d => d.type === 'result')
      .map(d => d.content)
  },
  
  getQuery: () => {
    return [[Query]]
  },

  newSpaceForWidget: (id, position, size) => {
    let space = document.createElement('div')
    space.id = `avocado_${id}`

    switch (position) {
    case 'top':
      document.querySelector('#avocadoTopPanel').appendChild(space)
      break
    case 'beside':
      document.querySelector('#avocadoBesidePanel').appendChild(space)
      break
    case 'fullPage':
      document.querySelector('#searchResults').style.display = 'none'
      // TODO: full page widgets
      break
    default:
      return null // invalid position
    }

    space.classList.add('avocado')
    space.classList.add(`avocado_${position}`)
    space.classList.add(`avocado__${size}`)

    return space
  },

  get: async (url, opts = {}) => {
    const res = await fetch(url, opts)
    const data = await res.json()
    return data
  },

  finishedLoading: () => {
    window.KagiWidgets.__loadCount++
  }
}

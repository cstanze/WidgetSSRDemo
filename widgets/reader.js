'use strict'


const fs = require('fs')

const extract = {

  /**
   * Extract one content.
   * @param  {String} filepath
   * @param  {String} annotation
   * @return {String} content
   */
  content: (filepath, annotation) => {
    return search(filepath, annotation)
  },

  /**
   * Extract array content.
   * @param  {String}   filepath
   * @param  {String}   annotation
   * @param  {String}   liststyle
   * @return {String[]} array of content OR false if NULL.
   */
  list: (filepath, annotation, liststyle = ',') => {
    let content = search(filepath, annotation)
    if (!content) return content

    // .replace(liststyle, '')
    let array = content.split(liststyle)
    return array.map(item => item.trim().replace(liststyle, ''))
  },

  /**
   * Convert to itemize.
   * @param  {String[]} items
   * @param  {String}   liststyle
   * @return {String}   content of content OR false if NULL.
   */
  itemize: (items, liststyle = ',') => {
    return !Array.isArray(items) ? false : items.map(item => `${liststyle}${item}`).join('\n')
  },
}

/**
 * Takes a string a returns a regex sanitized version.
 * @param  {String} string
 * @return {String} regex
 */
const sanitize = (string) => {
  // some real black magic here, love it
  return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
}

/**
 * Find annotation.
 * @param  {String} filepath
 * @param  {String} annotation
 * @return {String} content of content OR false if NULL.
 */
const search = (filepath, annotation) => {
  let file = fs.readFileSync(filepath, 'utf8')
  let regex = new RegExp(`~ ${sanitize(annotation)}\:\([\\s\\S]*?\)(-->|~)`)
  let content = file.match(regex)

  return !content ? false : content[1].trim().replace(/\s{2,}/g, '\n')
}

module.exports = extract

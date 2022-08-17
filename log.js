let { blue, yellow, red, cyan } = require('chalk')

const debug = (msg, ...args) => {
  console.log(cyan("error:"), cyan(msg), ...args)
}

const info = (msg, ...args) => {
  console.log(blue("info:"), blue(msg), ...args)
}

const warn = (msg, ...args) => {
  console.log(yellow("warn:"), yellow(msg), ...args)
}

const error = (msg, ...args) => {
  console.log(red("error:"), red(msg), ...args)
}

module.exports = {
  debug,
  info,
  warn,
  error
}

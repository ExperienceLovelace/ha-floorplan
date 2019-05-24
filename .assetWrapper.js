const path = require('path')

const CWD = process.cwd()
const PACKAGE = require(path.join(CWD, 'package.json'))

const varRequire = async ({ name, bundler }) => {
  // name = app.ere76r5e76r5e76r.js
  if (name.split('.').pop() === 'js' && bundler.options.production) {
    return {
      header: `var parcelRequire = undefined;`,
      footer: ``
    }
  }
}

module.exports = varRequire;
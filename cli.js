#!/usr/bin/env node
new (require('./dist/index').Generator)(undefined, null, true)
  .generate()
  .catch(e => {
    process.exit(1)
  })

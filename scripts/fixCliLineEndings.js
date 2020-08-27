const fs = require('fs')
const path = require('path')

const filePath = path.resolve(__dirname, '../cli.js')
const content = fs.readFileSync(filePath, 'utf8')
const fixedContent = content.replace(/\r/g, '')
fs.writeFileSync(filePath, fixedContent, 'utf8')

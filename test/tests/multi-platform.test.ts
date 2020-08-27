import * as fs from 'fs'
import * as path from 'path'

describe('Multi platform', () => {
  test('cli.js must not have \\r symbols', () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, '../../cli.js'),
      'utf8',
    )

    expect(content).not.toContain('\r')
  })
})

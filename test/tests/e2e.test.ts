import {execSync as exec} from 'child_process'
import {readFileSync, unlinkSync} from 'fs'
import * as path from 'path'

describe('Default behavior', () => {
  const scriptPath = path.resolve(__dirname, '..', '..', 'dist', 'index.js')
  const projectPath = path.resolve(__dirname, '..', 'sources', 'default')

  const dtsPath = path.resolve(
    __dirname,
    '..',
    'sources',
    'default',
    'index.d.ts',
  )

  let source: string

  beforeAll(() => {
    try {
      unlinkSync(dtsPath)
    } catch (e) {
      // NOT NEEDED
    }

    exec(`node "${scriptPath}" -m -r "${projectPath}" generate`)
    source = readFileSync(dtsPath, {encoding: 'utf8'})
  })

  afterAll(() => {
    unlinkSync(dtsPath)
  })

  it('exports all classes', () => {
    const classes = ['A', 'B', 'C']

    classes.forEach(cls => {
      expect(source.includes(`export class ${cls}`)).toBeTruthy()
    })
  })

  it('exports all types', () => {
    const interfaces = ['IText']

    interfaces.forEach(int => {
      expect(source.includes(`export type ${int}`)).toBeTruthy()
    })
  })

  it('exports all interfaces', () => {
    const interfaces = ['ISuggestedText']

    interfaces.forEach(int => {
      expect(source.includes(`export interface ${int}`)).toBeTruthy()
    })
  })

  it('does not leave relative paths', () => {
    expect(source.includes('from \'.')).toBeFalsy()
    expect(source.includes('import(\'.')).toBeFalsy()
  })

  it('does not touch 3rd party module imports', () => {
    expect(source.includes('\'winston\'')).toBeTruthy()
  })

  it('works correctly when index.ts is used', () => {
    expect(source.includes('from \'test-default/src/c/index\''))
    expect(source.includes('declare module \'test-default/src/c/index\''))
  })

  it('works correctly when index.ts is not used', () => {
    const modules = ['A', 'B']

    modules.forEach(m => {
      expect(
        source.includes(
          `declare module 'test-default/test/sources/default/src/${m.toLowerCase()}'`,
        ),
      ).toBeTruthy()

      expect(
        source.includes(
          `from 'test-default/test/sources/default/src/${m.toLowerCase()}'`,
        ),
      ).toBeTruthy()
    })
  })
})

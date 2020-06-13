import {execSync as exec} from 'child_process'
import {readFileSync, unlinkSync} from 'fs'
import * as path from 'path'

describe('Default behavior', () => {
  const scriptPath = path.resolve(__dirname, '..', '..', 'cli.js')
  const projectPath = path.resolve(__dirname, '..', 'sources', 'default')
  const jsProjectPath = path.resolve(__dirname, '..', 'sources', 'js')
  const customOutput = 'test.d.ts'

  const dtsPath = path.resolve(
    __dirname,
    '..',
    'sources',
    'default',
    'index.d.ts',
  )

  const customDtsPath = path.resolve(
    __dirname,
    '..',
    'sources',
    'default',
    customOutput,
  )

  const jsDtsPath = path.resolve(__dirname, '..', 'sources', 'js', 'index.d.ts')

  let source: string
  let customDtsSource: string
  let jsSource: string

  beforeAll(() => {
    try {
      unlinkSync(dtsPath)
    } catch (e) {
      // NOT NEEDED
    }

    exec(
      `node "${scriptPath}" -m -r "${projectPath}" -c " -p tsconfig.test.json" generate`,
    )

    exec(
      `node "${scriptPath}" -m -r "${projectPath}" -c " -p tsconfig.test.json" -o ${customOutput} generate`,
    )

    exec(
      `node "${scriptPath}" -m -r "${jsProjectPath}" -c " -p tsconfig.test.json" generate`,
    )

    source = readFileSync(dtsPath, {encoding: 'utf8'})
    customDtsSource = readFileSync(customDtsPath, {encoding: 'utf8'})
    jsSource = readFileSync(jsDtsPath, {encoding: 'utf8'})
  })

  afterAll(() => {
    unlinkSync(dtsPath)
    unlinkSync(customDtsPath)
    unlinkSync(jsDtsPath)
  })

  it('exports all TS classes', () => {
    const classes = ['A', 'B', 'C']

    classes.forEach((cls) => {
      expect(source.includes(`export class ${cls}`)).toBeTruthy()
    })
  })

  it('exports all JS classes', () => {
    const classes = ['XXX', 'YYY']

    classes.forEach((cls) => {
      expect(jsSource.includes(`export class ${cls}`)).toBeTruthy()
    })
  })

  it('exports all types', () => {
    const interfaces = ['IText']

    interfaces.forEach((int) => {
      expect(source.includes(`export type ${int}`)).toBeTruthy()
    })
  })

  it('exports all interfaces', () => {
    const interfaces = ['ISuggestedText', 'ASchema']

    interfaces.forEach((int) => {
      expect(source.includes(`export interface ${int}`)).toBeTruthy()
    })
  })

  it('does not leave relative paths', () => {
    expect(source.includes("from '.")).toBeFalsy()
    expect(jsSource.includes("from '.")).toBeFalsy()
    expect(source.includes("import('.")).toBeFalsy()
    expect(jsSource.includes("import('.")).toBeFalsy()
  })

  it('does not touch 3rd party module imports', () => {
    expect(source.includes("'winston'")).toBeTruthy()
  })

  it('works correctly when index.ts is used', () => {
    expect(
      source.includes("from 'test-default/test/sources/default/src/c/index'"),
    ).toBeTruthy()
    expect(
      source.includes(
        "declare module 'test-default/test/sources/default/src/c/index'",
      ),
    ).toBeTruthy()
  })

  it('works correctly when index.ts is not used', () => {
    const modules = ['A', 'B']

    modules.forEach((m) => {
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

  it('exports main NPM package module', () => {
    expect(source.includes("declare module 'test-default'")).toBeTruthy()
    expect(jsSource.includes("declare module 'test-js'")).toBeTruthy()
  })

  it('exports entry point under module name', () => {
    expect(source.includes("require('test-default/index')")).toBeTruthy()
    expect(jsSource.includes("require('test-js/index')")).toBeTruthy()
  })

  it('re-exports JS modules', () => {
    const modules = ['XXX', 'YYY']
    modules.forEach((m) => {
      expect(jsSource.includes(`export var ${m}`)).toBeTruthy()
    })
  })

  it('allows to customize output target', () => {
    expect(source).toBe(customDtsSource)
  })
})

import {execSync as exec} from 'child_process'
import {readFileSync, unlinkSync, writeFileSync} from 'fs'
import * as path from 'path'

// for debugging purposes
const STORE_DTS = false

describe('Default behavior', () => {
  const scriptPath = path.resolve(__dirname, '..', '..', 'cli.js')

  function getSource(
    args: string,
    expectedDtsFileName: string,
    project: 'js' | 'default',
    storeAs?: string,
  ) {
    const root = path.resolve(__dirname, '..', 'sources', project)
    const dtsPath = path.resolve(root, expectedDtsFileName)
    const cmd = `node "${scriptPath}" -m -r "${root}" -c " -p tsconfig.test.json" ${args} generate`
    exec(cmd)
    const source = readFileSync(dtsPath, {encoding: 'utf8'})
    unlinkSync(dtsPath)
    if (STORE_DTS && storeAs) writeFileSync(path.resolve(root, storeAs), source)
    return source
  }

  const dtsStandard = getSource(
    '',
    'index.d.ts',
    'default',
    '_dtsStandard.d.ts',
  )
  const dtsCustomOutput = getSource(
    `-o "test.d.ts"`,
    'test.d.ts',
    'default',
    '_dtsCustomOutput.d.ts',
  )
  const dtsCustomTemplate = getSource(
    `--customAlias "/* {package-name} */declare const myMod: typeof import('{main-module}')"`,
    'index.d.ts',
    'default',
    '_dtsCustomTemplate.d.ts',
  )
  const dtsShakeReferencedOnly = getSource(
    `--shake referencedOnly`,
    'index.d.ts',
    'default',
    '_dtsShakeReferencedOnly.d.ts',
  )

  const dtsJsSource = getSource(
    '-e index.js',
    'index.d.ts',
    'js',
    '_dtsJsSource.d.ts',
  )

  it('exports all TS classes', () => {
    const classes = ['A', 'B', 'C']

    classes.forEach(cls => {
      expect(dtsStandard.includes(`export class ${cls}`)).toBeTruthy()
    })
  })

  it('exports all JS classes', () => {
    const classes = ['XXX', 'YYY']

    classes.forEach(cls => {
      expect(dtsJsSource.includes(`export class ${cls}`)).toBeTruthy()
    })
  })

  it('exports all types', () => {
    const interfaces = ['IText']

    interfaces.forEach(int => {
      expect(dtsStandard.includes(`export type ${int}`)).toBeTruthy()
    })
  })

  it('exports all interfaces', () => {
    const interfaces = ['ISuggestedText', 'ASchema']

    interfaces.forEach(int => {
      expect(dtsStandard.includes(`export interface ${int}`)).toBeTruthy()
    })
  })

  it('does not leave relative paths', () => {
    expect(dtsStandard.includes("from '.")).toBeFalsy()
    expect(dtsJsSource.includes("from '.")).toBeFalsy()
    expect(dtsStandard.includes("import('.")).toBeFalsy()
    expect(dtsJsSource.includes("import('.")).toBeFalsy()
  })

  it('does not touch 3rd party module imports', () => {
    expect(dtsStandard.includes("'winston'")).toBeTruthy()
  })

  it('works correctly when index.ts is used', () => {
    expect(
      dtsStandard.includes(
        "from 'test-default/test/sources/default/src/c/index'",
      ),
    ).toBeTruthy()
    expect(
      dtsStandard.includes(
        "declare module 'test-default/test/sources/default/src/c/index'",
      ),
    ).toBeTruthy()
  })

  it('works correctly when index.ts is not used', () => {
    const modules = ['A', 'B']

    modules.forEach(m => {
      expect(
        dtsStandard.includes(
          `declare module 'test-default/test/sources/default/src/${m.toLowerCase()}'`,
        ),
      ).toBeTruthy()

      expect(
        dtsStandard.includes(
          `from 'test-default/test/sources/default/src/${m.toLowerCase()}'`,
        ),
      ).toBeTruthy()
    })
  })

  it('works correctly when module has a dot in its name', () => {
    expect(
      dtsStandard.includes(
        "declare module 'test-default/test/sources/default/src/a.schema'",
      ),
    ).toBeTruthy()

    expect(
      dtsStandard.includes(
        "from 'test-default/test/sources/default/src/a.schema'",
      ),
    ).toBeTruthy()
  })

  it('exports main NPM package module in default template', () => {
    expect(dtsStandard.includes("declare module 'test-default'")).toBeTruthy()
    expect(dtsJsSource.includes("declare module 'test-js'")).toBeTruthy()
  })

  it('exports entry point under module name in default template', () => {
    expect(dtsStandard.includes("require('test-default/index')")).toBeTruthy()
    expect(dtsJsSource.includes("require('test-js/index')")).toBeTruthy()
  })

  it('--customAlias appends the given, instead of the default template', () => {
    expect(
      dtsCustomTemplate.includes("declare module 'test-default'"),
    ).toBeFalsy()

    expect(
      dtsCustomTemplate.includes(
        "/* test-default */declare const myMod: typeof import('test-default/index')",
      ),
    ).toBeTruthy()
  })

  it('shake with the proper strategy', () => {
    expect(dtsStandard.includes('ASchema')).toBeTruthy()
    expect(dtsShakeReferencedOnly.includes('ASchema')).toBeFalsy()
  })

  it('re-exports JS modules', () => {
    const modules = ['XXX', 'YYY']
    modules.forEach(m => {
      expect(dtsJsSource.includes(`export const ${m}`)).toBeTruthy()
    })
  })

  it('allows to customize output target', () => {
    expect(dtsStandard).toBe(dtsCustomOutput)
  })
})

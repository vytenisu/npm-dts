import {execSync as exec} from 'child_process'
import {readFileSync, unlinkSync} from 'fs'
import * as path from 'path'

describe('Default behavior', () => {
  const scriptPath = path.resolve(__dirname, '..', '..', 'cli.js')

  function getSource(
    args: string,
    expectedDtsFileName: string,
    project: 'js' | 'default',
  ) {
    const root = path.resolve(__dirname, '..', 'sources', project)
    const dtsPath = path.resolve(root, expectedDtsFileName)
    const cmd = `node "${scriptPath}" -m -r "${root}" -c " -p tsconfig.test.json" ${args} generate`
    exec(cmd)
    const source = readFileSync(dtsPath, {encoding: 'utf8'})
    unlinkSync(dtsPath)
    return source
  }

  const standard = getSource('', 'index.d.ts', 'default')
  const customDtsSource = getSource(
    `--addAlias true -o "test.d.ts"`,
    'test.d.ts',
    'default',
  )
  const customDtsSourceNoAliasTemplate = getSource(
    `--template "declare const myMod: typeof import('{main-module}')" --addAlias false`,
    'index.d.ts',
    'default',
  )
  const shakeAllImports = getSource(
    `--shake allImports`,
    'index.d.ts',
    'default',
  )

  const jsSource = getSource('-e index.js', 'index.d.ts', 'js')

  it('exports all TS classes', () => {
    const classes = ['A', 'B', 'C']

    classes.forEach(cls => {
      expect(standard.includes(`export class ${cls}`)).toBeTruthy()
    })
  })

  it('exports all JS classes', () => {
    const classes = ['XXX', 'YYY']

    classes.forEach(cls => {
      expect(jsSource.includes(`export class ${cls}`)).toBeTruthy()
    })
  })

  it('exports all types', () => {
    const interfaces = ['IText']

    interfaces.forEach(int => {
      expect(standard.includes(`export type ${int}`)).toBeTruthy()
    })
  })

  it('exports all interfaces', () => {
    const interfaces = ['ISuggestedText', 'ASchema']

    interfaces.forEach(int => {
      expect(standard.includes(`export interface ${int}`)).toBeTruthy()
    })
  })

  it('does not leave relative paths', () => {
    expect(standard.includes("from '.")).toBeFalsy()
    expect(jsSource.includes("from '.")).toBeFalsy()
    expect(standard.includes("import('.")).toBeFalsy()
    expect(jsSource.includes("import('.")).toBeFalsy()
  })

  it('does not touch 3rd party module imports', () => {
    expect(standard.includes("'winston'")).toBeTruthy()
  })

  it('works correctly when index.ts is used', () => {
    expect(
      standard.includes("from 'test-default/test/sources/default/src/c/index'"),
    ).toBeTruthy()
    expect(
      standard.includes(
        "declare module 'test-default/test/sources/default/src/c/index'",
      ),
    ).toBeTruthy()
  })

  it('works correctly when index.ts is not used', () => {
    const modules = ['A', 'B']

    modules.forEach(m => {
      expect(
        standard.includes(
          `declare module 'test-default/test/sources/default/src/${m.toLowerCase()}'`,
        ),
      ).toBeTruthy()

      expect(
        standard.includes(
          `from 'test-default/test/sources/default/src/${m.toLowerCase()}'`,
        ),
      ).toBeTruthy()
    })
  })

  it('works correctly when module has a dot in its name', () => {
    expect(
      standard.includes(
        "declare module 'test-default/test/sources/default/src/a.schema'",
      ),
    ).toBeTruthy()

    expect(
      standard.includes(
        "from 'test-default/test/sources/default/src/a.schema'",
      ),
    ).toBeTruthy()
  })

  it('exports main NPM package module', () => {
    expect(standard.includes("declare module 'test-default'")).toBeTruthy()
    expect(jsSource.includes("declare module 'test-js'")).toBeTruthy()
  })

  it('exports entry point under module name', () => {
    expect(standard.includes("require('test-default/index')")).toBeTruthy()
    expect(jsSource.includes("require('test-js/index')")).toBeTruthy()
  })

  it('handles the --addAlias flag', () => {
    expect(standard.includes('export = main;')).toBeTruthy()
    expect(customDtsSource.includes('export = main;')).toBeTruthy()
    expect(
      customDtsSourceNoAliasTemplate.includes('export = main;'),
    ).toBeFalsy()
  })

  it('insert templates', () => {
    expect(
      customDtsSourceNoAliasTemplate.includes(
        "declare const myMod: typeof import('test-default/index')",
      ),
    ).toBeTruthy()
  })

  it('shake with the proper strategy', () => {
    expect(standard.includes('ASchema')).toBeTruthy()
    expect(shakeAllImports.includes('ASchema')).toBeFalsy()
  })

  it('re-exports JS modules', () => {
    const modules = ['XXX', 'YYY']
    modules.forEach(m => {
      expect(jsSource.includes(`export const ${m}`)).toBeTruthy()
    })
  })

  it('allows to customize output target', () => {
    expect(standard).toBe(customDtsSource)
  })
})

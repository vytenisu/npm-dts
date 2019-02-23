import {readdirSync, statSync, writeFileSync} from 'fs'
import {readFileSync} from 'fs'
import * as mkdir from 'mkdirp'
import * as npmRun from 'npm-run'
import {join, relative, resolve} from 'path'
import * as rm from 'rimraf'
import {Cli, ICliArgument} from './cmd'
import {debug, error, info, init, verbose, warn} from './log'

const MKDIR_RETRIES = 5

export class Generator extends Cli {
  private packageInfo: any

  public constructor() {
    super()

    init('npm-dts')

    this.generate() /*.catch(e => {
      error('Generation of index.d.ts has failed!')

      if (e) {
        debug(`Error: ${JSON.stringify(e)}`)
      }
    })*/
  }

  private showDebugError(e: any) {
    if (e) {
      debug(`Error: ${JSON.stringify(e)}`)
    }
  }

  private async generate() {
    verbose('Starting generation...')

    await this.generateTypings()
    let source = this.combineTypings()
    source = this.addAlias(source)
    this.storeResult(source)

    verbose('Generation is completed!')
  }

  private getEntry() {
    return this.getArgument(ICliArgument.entry)
  }

  private getRoot() {
    return resolve(this.getArgument(ICliArgument.root))
  }

  private getTempDir() {
    return resolve(this.getArgument(ICliArgument.tmp))
  }

  private makeTempDir(retries = MKDIR_RETRIES) {
    const tmpDir = this.getTempDir()
    verbose(`Creating tmp directory at ${tmpDir}...`)

    return new Promise((done, fail) => {
      mkdir(tmpDir, (mkdirError: any) => {
        if (mkdirError) {
          error('Failed to create tmp directory!')
          this.showDebugError(mkdirError)

          if (retries) {
            const sleepTime = 100
            verbose(`Will retry tmp directory creation in ${sleepTime}ms...`)

            setTimeout(() => {
              this.makeTempDir(retries - 1).then(done, fail)
            }, sleepTime)
          } else {
            error(`Stopped trying after ${MKDIR_RETRIES} retries`)
            fail()
          }
        } else {
          verbose('Tmp directory was successfully created!')
          done()
        }
      })
    })
  }

  private clearTempDir() {
    const tmpDir = this.getTempDir()
    verbose(`Clearing tmp directory at ${tmpDir}...`)

    return new Promise((done, fail) => {
      rm(tmpDir, rmError => {
        if (rmError) {
          error('Could not clear tmp directory!')
          this.showDebugError(rmError)
          fail()
        } else {
          verbose('Tmp directory was cleared!')
          done()
        }
      })
    })
  }

  private resetCacheDir() {
    verbose('Will now reset tmp directory...')
    return new Promise((done, fail) => {
      this.clearTempDir().then(() => {
        this.makeTempDir().then(done, fail)
      }, fail)
    })
  }

  private async generateTypings() {
    await this.resetCacheDir()

    verbose('Generating per-file typings using TSC...')

    const tscOptions = this.getArgument(ICliArgument.tsc)

    const cmd =
      'tsc --declaration --emitDeclarationOnly --declarationDir ' +
      this.getTempDir() +
      (tscOptions.length ? ` ${tscOptions}` : '')

    debug(cmd)

    npmRun.execSync(
      cmd,
      {
        cwd: this.getRoot(),
      },
      (err: any, stdout: any, stderr: any) => {
        if (err) {
          error('Failed to generate typings using TSC!')
          this.showDebugError(err)
        }

        if (stdout) {
          process.stdout.write(stdout)
        }

        if (stderr) {
          process.stderr.write(stderr)
        }
      },
    )

    verbose('Per-file typings have been generated using TSC!')
  }

  private getDeclarationFiles(dir: string = this.getTempDir(), files: string[] = []) {
    if (dir === this.getTempDir()) {
      verbose('Loading list of generated typing files...')
    }

    try {
      readdirSync(dir).forEach(file => {
        if (statSync(join(dir, file)).isDirectory()) {
          files = this.getDeclarationFiles(join(dir, file), files)
        } else {
          files = files.concat(join(dir, file))
        }
      })
    } catch (e) {
      error('Failed to load list of generated typing files...')
      this.showDebugError(e)
      throw e
    }

    if (dir === this.getTempDir()) {
      verbose('Successfully loaded list of generated typing files!')
    }

    return files
  }

  private getPackageDetails() {
    if (this.packageInfo) {
      return this.packageInfo
    }

    verbose('Loading package.json...')

    const root = this.getRoot()
    const packageJsonPath = resolve(root, 'package.json')

    try {
      this.packageInfo = JSON.parse(readFileSync(packageJsonPath, {encoding: 'utf8'}))
    } catch (e) {
      error(`Failed to read package.json at '${packageJsonPath}'`)
      this.showDebugError(e)
      throw e
    }

    verbose('package.json information has been loaded!')
    return this.packageInfo
  }

  private convertPathToModule(path: string, useRoot: boolean | string = false) {
    const packageDetails = this.getPackageDetails()

    if (typeof useRoot === 'string') {
      path = resolve(useRoot, path) // FIXME: This is wrong
    } else if (useRoot) {
      path = relative(this.getRoot(), path)
    } else {
      path = relative(this.getTempDir(), path)
    }

    path = `${packageDetails.name}/${path}`
    path = path.replace(/\\/g, '/')
    path = path.replace(/\..+$/g, '')
    path = path.replace(/\.d$/g, '')

    return path
  }

  private loadTypings() {
    const result: IDeclarationMap = {}

    const declarationFiles = this.getDeclarationFiles()

    verbose('Loading declaration files and mapping to modules...')
    declarationFiles.forEach(file => {
      const moduleName = this.convertPathToModule(file)

      try {
        result[moduleName] = readFileSync(file, {encoding: 'utf8'})
      } catch (e) {
        error(`Could not load declaration file '${file}'!`)
        this.showDebugError(e)
        throw e
      }
    })

    verbose('Loaded declaration files and mapped to modules!')
    return result
  }

  private resolveRelativeSources(source: string, moduleName: string) {
    source = source.replace(/\r\n/g, '\n')
    source = source.replace(/\n\r/g, '\n')
    source = source.replace(/\r/g, '\n')

    const lines = source.split('\n')

    lines.map(line => {
      const matches = line.match(/import .* from ['"]([^'"]+)['"]/)

      if (matches) {
        console.log(matches[1])
        console.log(moduleName)
        const resolvedModule = this.convertPathToModule(matches[1], moduleName)
        console.log(resolvedModule)
      }

      return line
    })

    return source
  }

  private combineTypings() {
    const typings = this.loadTypings()
    this.clearTempDir()

    verbose('Combining typings into single file...')

    const sourceParts: string[] = []

    Object.entries(typings).forEach(([moduleName, fileSource]) => {
      fileSource = fileSource.replace(/declare /g, '')
      fileSource = this.resolveRelativeSources(fileSource, moduleName)
      sourceParts.push(`declare module '${moduleName}' {\n${(fileSource as string).replace(/^./gm, '  $&')}\n}`)
    })

    verbose('Combined typings into a single file!')
    return sourceParts.join('\n')
  }

  private addAlias(source: string) {
    verbose('Adding alias for main file of the package...')

    const packageDetails = this.getPackageDetails()
    const entry = this.getEntry()

    if (!entry) {
      error('No entry file is available!')
      throw new Error('No entry file is available!')
    }

    const mainFile = this.convertPathToModule(entry, true)

    source +=
      `\ndeclare module '${packageDetails.name}' {\n` +
      `  import main = require('${mainFile}');\n` +
      '  export = main;\n' +
      '}'

    verbose('Successfully created alias for main file!')

    return source
  }

  private storeResult(source: string) {
    verbose('Storing typings into index.d.ts file...')

    const root = this.getRoot()
    const file = resolve(root, 'index.d.ts')

    try {
      writeFileSync(file, source, {encoding: 'utf8'})
    } catch (e) {
      error('Failed to create index.d.ts!')
      this.showDebugError(e)
      throw e
    }

    verbose('Successfully created index.d.ts file!')
  }
}

export interface IDeclarationMap {
  [path: string]: string
}

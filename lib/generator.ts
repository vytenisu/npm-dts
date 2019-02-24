import {readdirSync, statSync, writeFileSync} from 'fs'
import {readFileSync} from 'fs'
import * as mkdir from 'mkdirp'
import * as npmRun from 'npm-run'
import {join, relative, resolve} from 'path'
import * as rm from 'rimraf'
import {Cli, ICliArgument} from './cmd'
import {debug, error, init, verbose} from './log'

const MKDIR_RETRIES = 5

/**
 * Logic for generating aggregated typings for NPM module
 */
export class Generator extends Cli {
  private packageInfo: any
  private moduleNames: string[]

  /**
   * Auto-launches generation based on command line arguments
   */
  public constructor() {
    super()

    init('npm-dts')

    this.generate().catch(e => {
      error('Generation of index.d.ts has failed!')

      if (e) {
        debug(`Error: ${JSON.stringify(e)}`)
      }
    })
  }

  /**
   * Logs serialized error if it exists
   * @param e - error to be shown
   */
  private showDebugError(e: any) {
    if (e) {
      debug(`Error: ${JSON.stringify(e)}`)
    }
  }

  /**
   * Launches generation of typings
   */
  private async generate() {
    verbose('Starting generation...')

    await this.generateTypings()
    let source = this.combineTypings()
    source = this.addAlias(source)
    this.storeResult(source)

    verbose('Generation is completed!')
  }

  /**
   * Gathers entry file address (relative to project root path)
   */
  private getEntry(): string {
    return this.getArgument(ICliArgument.entry)
  }

  /**
   * Gathers target project root path
   */
  private getRoot(): string {
    return resolve(this.getArgument(ICliArgument.root))
  }

  /**
   * Gathers TMP directory to be used for TSC operations
   */
  private getTempDir(): string {
    return resolve(this.getArgument(ICliArgument.tmp))
  }

  /**
   * Checks if script is forced to use its built-in TSC
   */
  private useOwnTsc(): boolean {
    return this.getArgument(ICliArgument.ownTsc)
  }

  /**
   * Creates TMP directory to be used for TSC operations
   * @param retries amount of times to retry on failure
   */
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

  /**
   * Removes TMP directory
   */
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

  /**
   * Re-creates empty TMP directory to be used for TSC operations
   */
  private resetCacheDir() {
    verbose('Will now reset tmp directory...')
    return new Promise((done, fail) => {
      this.clearTempDir().then(() => {
        this.makeTempDir().then(done, fail)
      }, fail)
    })
  }

  /**
   * Generates per-file typings using TSC
   */
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
        cwd: this.useOwnTsc() ? resolve(__dirname, '..') : this.getRoot(),
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

  /**
   * Gathers a list of created per-file declaration files
   * @param dir directory to be scanned for files (called during recursion)
   * @param files discovered array of files (called during recursion)
   */
  private getDeclarationFiles(
    dir: string = this.getTempDir(),
    files: string[] = [],
  ) {
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

  /**
   * Loads package.json information of target project
   */
  private getPackageDetails() {
    if (this.packageInfo) {
      return this.packageInfo
    }

    verbose('Loading package.json...')

    const root = this.getRoot()
    const packageJsonPath = resolve(root, 'package.json')

    try {
      this.packageInfo = JSON.parse(
        readFileSync(packageJsonPath, {encoding: 'utf8'}),
      )
    } catch (e) {
      error(`Failed to read package.json at '${packageJsonPath}'`)
      this.showDebugError(e)
      throw e
    }

    verbose('package.json information has been loaded!')
    return this.packageInfo
  }

  /**
   * Generates module name based on file path
   * @param path path to be converted to module name
   * @param useRoot assumes path to be under target project root
   * @param noPrefix disables addition of module name as prefix for module name
   */
  private convertPathToModule(
    path: string,
    rootType: IBasePathType = IBasePathType.tmp,
    noPrefix = false,
  ) {
    const packageDetails = this.getPackageDetails()

    if (rootType === IBasePathType.cwd) {
      path = relative(process.cwd(), path)
    } else if (rootType === IBasePathType.root) {
      path = relative(this.getRoot(), path)
    } else if (rootType === IBasePathType.tmp) {
      path = relative(this.getTempDir(), path)
    }

    if (!noPrefix) {
      path = `${packageDetails.name}/${path}`
    }

    path = path.replace(/\\/g, '/')
    path = path.replace(/\..+$/g, '')
    path = path.replace(/\.d$/g, '')

    return path
  }

  /**
   * Loads generated per-file declaration files
   */
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

  private resolveImportSourcesAtLine(
    regexp: RegExp,
    line: string,
    moduleName: string,
  ) {
    const matches = line.match(regexp)

    if (matches && matches[2].startsWith('.')) {
      const relativePath = `../${matches[2]}`

      let resolvedModule = resolve(moduleName, relativePath)

      resolvedModule = this.convertPathToModule(
        resolvedModule,
        IBasePathType.cwd,
        true,
      )

      if (!this.moduleExists(resolvedModule)) {
        resolvedModule += '/index'
      }

      line = line.replace(regexp, `$1${resolvedModule}$3`)
    }

    return line
  }

  /**
   * Alters import sources to avoid relative addresses and default index usage
   * @param source import source to be resolved
   * @param moduleName name of module containing import
   */
  private resolveImportSources(source: string, moduleName: string) {
    source = source.replace(/\r\n/g, '\n')
    source = source.replace(/\n\r/g, '\n')
    source = source.replace(/\r/g, '\n')

    let lines = source.split('\n')

    lines = lines.map(line => {
      line = this.resolveImportSourcesAtLine(
        /(from ['"])([^'"]+)(['"])/,
        line,
        moduleName,
      )

      line = this.resolveImportSourcesAtLine(
        /(import\(['"])([^'"]+)(['"]\))/,
        line,
        moduleName,
      )

      return line
    })

    source = lines.join('\n')

    return source
  }

  /**
   * Combines typings into a single declaration source
   */
  private combineTypings() {
    const typings = this.loadTypings()
    this.clearTempDir()

    this.moduleNames = Object.keys(typings)

    verbose('Combining typings into single file...')

    const sourceParts: string[] = []

    Object.entries(typings).forEach(([moduleName, fileSource]) => {
      fileSource = fileSource.replace(/declare /g, '')
      fileSource = this.resolveImportSources(fileSource, moduleName)
      sourceParts.push(
        `declare module '${moduleName}' {\n${(fileSource as string).replace(
          /^./gm,
          '  $&',
        )}\n}`,
      )
    })

    verbose('Combined typings into a single file!')
    return sourceParts.join('\n')
  }

  /**
   * Verifies if module specified exists among known modules
   * @param moduleName name of module to be checked
   */
  private moduleExists(moduleName: string) {
    return this.moduleNames.includes(moduleName)
  }

  /**
   * Adds alias for main NPM package file to generated index.d.ts source
   * @param source generated index.d.ts declaration source so far
   */
  private addAlias(source: string) {
    verbose('Adding alias for main file of the package...')

    const packageDetails = this.getPackageDetails()
    const entry = this.getEntry()

    if (!entry) {
      error('No entry file is available!')
      throw new Error('No entry file is available!')
    }

    const mainFile = this.convertPathToModule(entry, IBasePathType.cwd)

    source +=
      `\ndeclare module '${packageDetails.name}' {\n` +
      `  import main = require('${mainFile}');\n` +
      '  export = main;\n' +
      '}'

    verbose('Successfully created alias for main file!')

    return source
  }

  /**
   * Stores generated index.d.ts declaration source into file
   * @param source generated index.d.ts source
   */
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

/**
 * Map of modules and their declarations
 */
export interface IDeclarationMap {
  [moduleNames: string]: string
}

/**
 * Types of base path used during path resolving
 */
export enum IBasePathType {
  /**
   * Base path is root of targeted project
   */
  root = 'root',

  /**
   * Base path is tmp directory
   */
  tmp = 'tmp',

  /**
   * Base path is CWD
   */
  cwd = 'cwd',
}

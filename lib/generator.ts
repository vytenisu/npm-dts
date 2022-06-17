import {readdirSync, statSync, writeFileSync} from 'fs'
import {readFileSync} from 'fs'
import * as mkdir from 'mkdirp'
import * as npmRun from 'npm-run'
import {join, relative, resolve, dirname} from 'path'
import * as rm from 'rimraf'
import * as tmp from 'tmp'
import {Cli, ECliArgument, INpmDtsArgs} from './cli'
import {debug, ELogLevel, error, info, init, verbose, warn} from './log'
import * as fs from 'fs'

const MKDIR_RETRIES = 5

/**
 * Logic for generating aggregated typings for NPM module
 */
export class Generator extends Cli {
  private packageInfo: any
  private moduleNames: string[]
  private throwErrors: boolean
  private cacheContentEmptied: boolean = true

  /**
   * Auto-launches generation based on command line arguments
   * @param injectedArguments generation arguments (same as CLI)
   * @param enableLog enables logging when true, null allows application to decide
   * @param throwErrors makes generation throw errors when true
   */
  public constructor(
    injectedArguments?: INpmDtsArgs,
    enableLog: boolean | null = null,
    throwErrors = false,
  ) {
    super(injectedArguments)

    this.throwErrors = throwErrors

    if (enableLog === null) {
      enableLog = !injectedArguments
    }

    if (enableLog) {
      init('npm-dts', this.getLogLevel())

      const myPackageJson = JSON.parse(
        readFileSync(resolve(__dirname, '..', 'package.json'), {
          encoding: 'utf8',
        }),
      )

      const soft = `          npm-dts v${myPackageJson.version}                `
      let author = '          by Vytenis Urbonavičius                          '
      let spaces = '                                                           '
      let border = '___________________________________________________________'

      author = author.substring(0, soft.length)
      spaces = spaces.substring(0, soft.length)
      border = border.substring(0, soft.length)

      info(` ${border} `)
      info(`|${spaces}|`)
      info(`|${spaces}|`)
      info(`|${soft}|`)
      info(`|${author}|`)
      info(`|${spaces}|`)
      info(`|${border}|`)
      info(` ${spaces} `)
    }
  }

  /**
   * Executes generation of single declaration file
   */
  public async generate() {
    info(`Generating declarations for "${this.getRoot()}"...`)

    let hasError = false
    let exception = null
    const cleanupTasks: (() => void)[] = []

    if (!this.tmpPassed) {
      verbose('Locating OS Temporary Directory...')

      try {
        await new Promise<void>(done => {
          tmp.dir((tmpErr, tmpDir, rmTmp) => {
            if (tmpErr) {
              error('Could not create OS Temporary Directory!')
              this.showDebugError(tmpErr)
              throw tmpErr
            }

            verbose('OS Temporary Directory was located!')
            this.setArgument(ECliArgument.tmp, resolve(tmpDir, 'npm-dts'))

            cleanupTasks.push(() => {
              verbose('Deleting OS Temporary Directory...')
              rmTmp()
              verbose('OS Temporary Directory was deleted!')
            })
            done()
          })
        })
      } catch (e) {
        hasError = true
        exception = e
      }
    }

    if (!hasError) {
      await this._generate().catch(async e => {
        hasError = true

        const output = this.getOutput()

        error(`Generation of ${output} has failed!`)
        this.showDebugError(e)

        if (!this.useForce()) {
          if (this.getLogLevel() === ELogLevel.debug) {
            info(
              'If issue is not severe, you can try forcing execution using force flag.',
            )
            info(
              'In case of command line usage, add "-f" as the first parameter.',
            )
          } else {
            info('You should try running npm-dts with debug level logging.')
            info(
              'In case of command line, debug mode is enabled using "-L debug".',
            )
          }
        }

        if (!this.cacheContentEmptied) {
          await this.clearTempDir()
        }

        exception = e
      })
    }

    cleanupTasks.forEach(task => task())

    if (!hasError) {
      info('Generation is completed!')
    } else {
      error('Generation failed!')

      if (this.throwErrors) {
        throw exception || new Error('Generation failed!')
      }
    }
  }

  /**
   * Logs serialized error if it exists
   * @param e - error to be shown
   */
  private showDebugError(e: any) {
    if (e) {
      if (e.stdout) {
        debug(`Error: \n${e.stdout.toString()}`)
      } else {
        debug(`Error: \n${JSON.stringify(e)}`)
      }
    }
  }

  /**
   * Launches generation of typings
   */
  private async _generate() {
    await this.generateTypings()
    let source = await this.combineTypings()
    source = this.addAlias(source)
    source = this.addTemplate(source)
    await this.storeResult(source)
  }

  private getLogLevel(): ELogLevel {
    const logLevel = this.getArgument(ECliArgument.logLevel) as ELogLevel
    return ELogLevel[logLevel] ? logLevel : ELogLevel.info
  }

  /**
   * Gathers entry file address (relative to project root path)
   */
  private getEntry(): string {
    return this.getArgument(ECliArgument.entry) as string
  }

  /**
   * Gathers target project root path
   */
  private getRoot(): string {
    return resolve(this.getArgument(ECliArgument.root) as string)
  }

  /**
   * Gathers TMP directory to be used for TSC operations
   */
  private getTempDir(): string {
    return resolve(this.getArgument(ECliArgument.tmp) as string)
  }

  /**
   * Gathers output path to be used (relative to root)
   */
  private getOutput(): string {
    return this.getArgument(ECliArgument.output) as string
  }

  /**
   * Append this template where {0} is replaced with the name/path of the entry module.
   */
  private getTemplate(): string | undefined {
    return this.getArgument(ECliArgument.template) as string | undefined
  }

  /**
   * Checks if script is forced to use its built-in TSC
   */
  private useTestMode(): boolean {
    return this.getArgument(ECliArgument.testMode) as boolean
  }

  /**
   * Checks if an alias for the main NPM package file should be
   * added to the generated .d.ts source
   */
  private noAlias(): boolean {
    return this.getArgument(ECliArgument.noAlias) as boolean
  }

  /**
   * Checks if script is forced to attempt generation despite errors
   */
  private useForce(): boolean {
    return this.getArgument(ECliArgument.force) as boolean
  }

  /**
   * Checks how and if tree-shaking should be applied
   */
  private getShake(): 'off' | 'exportOnly' | 'allImports' {
    const shake = this.getArgument(ECliArgument.shake) as
      | undefined
      | 'off'
      | 'exportOnly'
      | 'allImports'
    if (shake === undefined) return 'off'
    if (shake === 'exportOnly' || shake === 'allImports' || shake === 'off')
      return shake
    error(`Unknown value for shake "${shake}"`)
    if (shake === undefined) return 'off'
  }

  /**
   * Creates TMP directory to be used for TSC operations
   * @param retries amount of times to retry on failure
   */
  private makeTempDir(retries = MKDIR_RETRIES): Promise<void> {
    const tmpDir = this.getTempDir()
    verbose('Preparing "tmp" directory...')

    return new Promise((done, fail) => {
      mkdir(tmpDir)
        .then(() => {
          this.cacheContentEmptied = false
          verbose('"tmp" directory was prepared!')
          done()
        })
        .catch(mkdirError => {
          error(`Failed to create "${tmpDir}"!`)
          this.showDebugError(mkdirError)

          if (retries) {
            const sleepTime = 100
            verbose(`Will retry in ${sleepTime}ms...`)

            setTimeout(() => {
              this.makeTempDir(retries - 1).then(done, fail)
            }, sleepTime)
          } else {
            error(`Stopped trying after ${MKDIR_RETRIES} retries!`)
            fail()
          }
        })
    })
  }

  /**
   * Removes TMP directory
   */
  private clearTempDir() {
    const tmpDir = this.getTempDir()
    verbose('Cleaning up "tmp" directory...')

    return new Promise<void>((done, fail) => {
      rm(tmpDir, rmError => {
        if (rmError) {
          error(`Could not clean up "tmp" directory at "${tmpDir}"!`)
          this.showDebugError(rmError)
          fail()
        } else {
          this.cacheContentEmptied = true
          verbose('"tmp" directory was cleaned!')
          done()
        }
      })
    })
  }

  /**
   * Re-creates empty TMP directory to be used for TSC operations
   */
  private resetCacheDir() {
    verbose('Will now reset "tmp" directory...')
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

    const tscOptions = this.getArgument(ECliArgument.tsc) as string

    const cmd =
      'tsc --declaration --emitDeclarationOnly --declarationDir "' +
      this.getTempDir() +
      '"' +
      (tscOptions.length ? ` ${tscOptions}` : '')

    debug(cmd)

    try {
      npmRun.execSync(
        cmd,
        {
          cwd: this.useTestMode() ? resolve(__dirname, '..') : this.getRoot(),
        },
        (err: any, stdout: any, stderr: any) => {
          if (err) {
            if (this.useForce()) {
              warn('TSC exited with errors!')
            } else {
              error('TSC exited with errors!')
            }

            this.showDebugError(err)
          } else {
            if (stdout) {
              process.stdout.write(stdout)
            }

            if (stderr) {
              process.stderr.write(stderr)
            }
          }
        },
      )
    } catch (e) {
      if (this.useForce()) {
        warn('Suppressing errors due to "force" flag!')
        this.showDebugError(e)
        warn('Generated declaration files might not be valid!')
      } else {
        throw e
      }
    }

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
      error(`Failed to read package.json at "'${packageJsonPath}'"`)
      this.showDebugError(e)
      throw e
    }

    verbose('package.json information has been loaded!')
    return this.packageInfo
  }

  /**
   * Generates module name based on file path
   * @param path path to be converted to module name
   * @param options additional conversion options
   */
  private convertPathToModule(
    path: string,
    options: ConvertPathToModuleOptions = {},
  ) {
    const {
      rootType = IBasePathType.tmp,
      noPrefix = false,
      noExtensionRemoval = false,
      noExistenceCheck = false,
    } = options

    const packageDetails = this.getPackageDetails()

    const fileExisted =
      noExistenceCheck ||
      (!noExtensionRemoval &&
        fs.existsSync(path) &&
        fs.lstatSync(path).isFile())

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

    if (fileExisted && !noExtensionRemoval) {
      path = path.replace(/\.[^.]+$/g, '')
      path = path.replace(/\.d$/g, '')
    }

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

      resolvedModule = this.convertPathToModule(resolvedModule, {
        rootType: IBasePathType.cwd,
        noPrefix: true,
        noExtensionRemoval: true,
      })

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
    let lines = this.sourceLines(source)

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

  private sourceLines(source: string) {
    source = source.replace(/\r\n/g, '\n')
    source = source.replace(/\n\r/g, '\n')
    source = source.replace(/\r/g, '\n')

    const lines = source.split('\n')
    return lines
  }

  private findDependencies(
    typings: IDeclarationMap,
    moduleName: string,
    shakenTypings: Set<string>,
    filter: 'exportOnly' | 'allImports',
  ): void {
    shakenTypings.add(moduleName)
    const current = typings[moduleName]
    const lines = this.sourceLines(current)
    const refs =
      filter === 'allImports'
        ? this.findAllImportedRefs(lines)
        : this.findExportedRefsOnly(lines)
    verbose(`"${moduleName}" references ${JSON.stringify(refs)}`)

    for (const ref of refs) {
      this.findDependencies(typings, ref, shakenTypings, filter)
    }
  }

  private findExportedRefsOnly(lines: string[]) {
    const exports = /export .*? from ['"]([^'"]+)['"]/
    const refs = lines.map(l => l.match(exports))
    return refs.filter(m => m !== null).map(m => m[1])
  }

  private findAllImportedRefs(lines: string[]) {
    const staticImports = /(from ['"])([^'"]+)(['"])/
    const inlineImport = /(import\(['"])([^'"]+)(['"]\))/
    const refs = [
      ...lines.map(l => l.match(staticImports)),
      ...lines.map(l => l.match(inlineImport)),
    ]
    return refs.filter(m => m !== null).map(m => m[1])
  }

  /**
   * Combines typings into a single declaration source
   */
  private async combineTypings() {
    let typings = this.loadTypings()
    await this.clearTempDir()

    this.moduleNames = Object.keys(typings)

    verbose('Combining typings into single file...')

    Object.entries(typings).forEach(([moduleName, fileSource]) => {
      fileSource = fileSource.replace(/declare /g, '')
      fileSource = this.resolveImportSources(fileSource, moduleName)
      typings[moduleName] = fileSource
    })

    const mainFile = this.getMain()
    const shake = this.getShake()

    if (shake !== 'off') {
      verbose(`Shaking typeings using the ${shake} strategy.`)
      const referenced = new Set<string>()
      this.findDependencies(typings, mainFile, referenced, shake)
      const shakenTypings = Object.fromEntries(
        Array.from(referenced).map(ref => [ref, typings[ref]]),
      )
      typings = shakenTypings
    }

    const sourceParts: string[] = []
    Object.entries(typings).forEach(([moduleName, fileSource]) => {
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
   * Adds an  alias for the main NPM package file to the
   * generated .d.ts source
   * @param source generated .d.ts declaration source so far
   */
  private addAlias(source: string) {
    if (this.noAlias()) return source
    verbose('Adding alias for main file of the package...')

    const packageDetails = this.getPackageDetails()
    const mainFile = this.getMain()

    source +=
      `\ndeclare module '${packageDetails.name}' {\n` +
      `  import main = require('${mainFile}');\n` +
      '  export = main;\n' +
      '}'

    verbose('Successfully created alias for main file!')

    return source
  }

  private getMain() {
    const entry = this.getEntry()

    if (!entry) {
      error('No entry file is available!')
      throw new Error('No entry file is available!')
    }

    const mainFile = this.convertPathToModule(resolve(this.getRoot(), entry), {
      rootType: IBasePathType.root,
      noExistenceCheck: true,
    })
    return mainFile
  }

  /**
   * Append template where {0} is replaced with the name/path of the entry module.
   * @param source generated .d.ts declaration source so far
   */
  private addTemplate(source: string) {
    const tpl = this.getTemplate()
    if (!tpl) return source
    verbose('Adding template')

    const entry = this.getEntry()

    if (!entry) {
      error('No entry file is available!')
      throw new Error('No entry file is available!')
    }

    const mainFile = this.convertPathToModule(resolve(this.getRoot(), entry), {
      rootType: IBasePathType.root,
      noExistenceCheck: true,
    })

    const appliedTemplate = tpl.replace('{0}', mainFile)

    source += '\n' + appliedTemplate + '\n'

    verbose('Successfully added template!')

    return source
  }

  /**
   * Stores generated .d.ts declaration source into file
   * @param source generated .d.ts source
   */
  private async storeResult(source: string) {
    const output = this.getOutput()
    const root = this.getRoot()
    const file = resolve(root, output)
    const folderPath = dirname(file)

    verbose('Ensuring that output folder exists...')
    debug(`Creating output folder: "${folderPath}"...`)

    try {
      await mkdir(folderPath)
    } catch (mkdirError) {
      error(`Failed to create "${folderPath}"!`)
      this.showDebugError(mkdirError)
      throw mkdirError
    }

    verbose('Output folder is ready!')
    verbose(`Storing typings into ${output} file...`)

    try {
      writeFileSync(file, source, {encoding: 'utf8'})
    } catch (e) {
      error(`Failed to create ${output}!`)
      this.showDebugError(e)
      throw e
    }

    verbose(`Successfully created ${output} file!`)
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

/**
 * Additional conversion options
 */
export interface ConvertPathToModuleOptions {
  /**
   * Type of base path used during path resolving
   */
  rootType?: IBasePathType

  /**
   * Disables addition of module name as prefix for module name
   */
  noPrefix?: boolean

  /**
   * Disables extension removal
   */
  noExtensionRemoval?: boolean

  /**
   * Disables existence check and assumes that file exists
   */
  noExistenceCheck?: boolean
}

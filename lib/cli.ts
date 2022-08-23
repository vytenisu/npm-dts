import * as args from 'args'
import * as path from 'path'
import {ELogLevel} from './log'

/**
 * CLI argument names
 */
export enum ECliArgument {
  /**
   * Main file of non-bundled package source
   */
  entry = 'entry',

  /**
   * Root directory of targeted package
   */
  root = 'root',

  /**
   * Temporary directory required during generation
   */
  tmp = 'tmp',

  /**
   * Additional TSC properties
   */
  tsc = 'tsc',

  /**
   * Selected logging level
   */
  logLevel = 'logLevel',

  /**
   * Output file path (relative to root)
   */
  output = 'output',

  /**
   * Append this template where {0} is replaced with the name/path of the entry module.
   */
  template = 'template',

  /**
   * Flag which forces using own TSC as opposed to target TSC
   * This should only be used for testing npm-dts itself
   * This is because it generates incorrect module names
   */
  testMode = 'testMode',

  /**
   * Flag which enables/disable adding an alias for the main NPM
   * package file to the generated .d.ts source
   */
  addAlias = 'addAlias',

  /**
   * Flag which forces attempting generation at least partially despite errors
   */
  force = 'force',

  /**
   * Basic tree-shaking on module level
   */
  shake = 'shake',
}

/** options for the --shake argument */
export enum EShakeOptions {
  /** dont shake (default) */
  off = 'off',

  /** remove everything but exported modules */
  exportOnly = 'exportOnly',

  /** only keep modules that are referenced by the entry module */
  allImports = 'allImports',
}

/**
 * Configuration structure for generating an aggregated dts file
 */
export interface INpmDtsArgs {
  /**
   * Iterator
   */
  [argName: string]: string | boolean

  /**
   * Main file of non-bundled package source. Can be a path relative to TSC rootDir.
   */
  entry?: string

  /**
   * Root directory of targeted package
   */
  root?: string

  /**
   * Temporary directory required during generation
   */
  tmp?: string

  /**
   * Additional TSC properties
   */
  tsc?: string

  /**
   * Selected logging level
   */
  logLevel?: ELogLevel

  /**
   * Add an alias for the main NPM package file to the generated .d.ts source
   */
  addAlias?: 'true' | 'false'

  /**
   * Attempts to at least partially generate typings ignoring non-critical errors
   */
  force?: boolean

  /**
   * Basic tree-shaking on module level
   */
  shake?: EShakeOptions

  /**
   * Output file path (relative to root)
   */
  output?: string

  /**
   * Append this template where {0} is replaced with the name/path of the entry module.
   */
  template?: string

  /**
   * Flag which forces using own TSC as opposed to target TSC
   * This should only be used for testing npm-dts itself
   * This is because it generates incorrect module names
   */
  testMode?: boolean
}

/**
 * CLI usage logic
 */
export class Cli {
  /**
   * Stores whether module was successfully launched
   */
  protected launched = false

  /**
   * Stores whether TMP directory location was passed
   */
  protected tmpPassed = false

  /**
   * Stores current CLI argument values
   */
  private args: INpmDtsArgs = {
    entry: 'index.ts',
    root: path.resolve(process.cwd()),
    tmp: '<TEMP>',
    tsc: '',
    logLevel: ELogLevel.info,
    addAlias: 'true',
    force: false,
    shake: EShakeOptions.off,
    output: 'index.d.ts',
    template: undefined,
    testMode: false,
  }

  /**
   * Automatically reads CLI arguments and performs actions based on them
   */
  public constructor(injectedArguments?: INpmDtsArgs) {
    if (injectedArguments) {
      this.launched = true
      this.storeArguments(injectedArguments)
    } else {
      args
        .option(
          ['e', 'entry'],
          'Entry/main package file before bundling, relative to project root',
        )
        .option(
          ['r', 'root'],
          'NPM package directory containing package.json',
          this.args.root,
        )
        .option(
          ['t', 'tmp'],
          'Directory for storing temporary information',
          this.args.tmp,
          (value: string) => {
            if (!value.includes('<')) {
              this.tmpPassed = true
            }

            return value
          },
        )
        .option(
          ['c', 'tsc'],
          'Passed through non-validated additional TSC options',
          this.args.tsc,
        )
        .option(
          ['L', 'logLevel'],
          'Log level (error, warn, info, verbose, debug)',
          this.args.logLevel,
        )
        .option(
          'addAlias',
          'Add an alias for the main NPM package file to the generated .d.ts source (true, false) - default true',
          this.args.addAlias,
        )
        .option(
          ['f', 'force'],
          'Ignores non-critical errors and attempts to at least partially generate typings',
          this.args.force,
        )
        .option(
          ['s', 'shake'],
          'Basic tree-shaking for modules. (off (default), exportOnly, allImports). allImports drops modules not referenced by entry. exportOnly only keeps modules which are referenced with the export from ... keyword.',
          this.args.shake,
        )
        .option(
          ['o', 'output'],
          'Overrides recommended output target to a custom one',
          this.args.output,
        )
        .option(
          'template',
          'Append this template where {0} is replaced with the name/path of the entry module.',
          this.args.template,
        )
        .option(
          ['m', 'testMode'],
          'Configures npm-dts for self-test',
          this.args.testMode,
        )
        .command('generate', 'Start generation', (name, sub, options) => {
          this.launched = true
          this.storeArguments(options)
        })
        .example(
          'npm-dts generate',
          'Generates index.d.ts file and updates package.json for CWD.',
        )
        .example(
          'npm-dts -r /your/project/path generate',
          'Performs generation on a custom path.',
        )

      args.parse(process.argv, {
        name: 'npm-dts',
        mri: {},
        mainColor: 'yellow',
        subColor: 'dim',
      })

      if (!this.launched) {
        args.showHelp()
      }
    }
  }

  /**
   * Gathers current value of a particular CLI argument
   * @param arg argument name
   */
  protected getArgument(arg: ECliArgument) {
    return this.args[arg]
  }

  /**
   * Dynamically overrides value of stored argument
   * @param arg argument name
   * @param value argument value
   */
  protected setArgument(arg: ECliArgument, value: string | boolean) {
    // @ts-ignore
    this.args[arg] = value
  }

  /**
   * Stores entered CLI arguments
   * @param passedArguments arguments entered to CLI
   */
  private storeArguments(passedArguments: any = this.args) {
    for (const argName of Object.keys(this.args)) {
      this.args[argName] = Object.is(passedArguments[argName], undefined)
        ? this.args[argName]
        : passedArguments[argName]
    }
  }
}

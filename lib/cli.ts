import * as args from 'args'
import * as path from 'path'

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
   * Flag which forces using own TSC as opposed to target TSC
   * This should only be used for testing npm-dts itself
   * This is because it generates incorrect module names
   */
  testMode = 'testMode',
}

/**
 * Format for storing passed argument values
 */
export interface INpmDtsArgs {
  /**
   * Iterator
   */
  [argName: string]: string | boolean

  /**
   * Main file of non-bundled package source
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
   * Flag which forces using own TSC as opposed to target TSC
   * This should only be used for testing npm-dts itself
   * This is because it generates incorrect module names
   */
  testMode: boolean
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
   * Stores current CLI argument values
   */
  private args: INpmDtsArgs = {
    entry: 'index.ts',
    root: path.resolve(process.cwd()),
    tmp: path.resolve(process.cwd(), 'tmp'),
    tsc: '',
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
        )
        .option(
          ['c', 'tsc'],
          'Passed through non-validated additional TSC options',
          this.args.tsc,
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
          'npm-dts -r . generate',
          'Generates index.d.ts file and updates package.json for CWD.',
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

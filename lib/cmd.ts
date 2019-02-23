import * as args from 'args'
import * as path from 'path'

/**
 * CLI argument names
 */
export enum ICliArgument {
  entry = 'entry',
  root = 'root',
  tmp = 'tmp',
  tsc = 'tsc',
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
  private args: {[name: string]: any} = {
    entry: 'index.ts',
    root: path.resolve(process.cwd()),
    tmp: path.resolve(process.cwd(), 'tmp'),
    tsc: '',
  }

  /**
   * Automatically reads CLI arguments and performs actions based on them
   */
  public constructor() {
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
        'Directory used for storing temporary information during generation',
        this.args.tmp,
      )
      .option(
        ['c', 'tsc'],
        'Passed through non-validated additional TSC options',
        this.args.tsc,
      )
      .command('generate', 'Start generation', (name, sub, options) => {
        this.launched = true
        this.storeArguments(options)
      })
      .example(
        'dts-auto-bundle -r . generate',
        'Generates index.d.ts file and updates package.json for CWD.',
      )

    args.parse(process.argv, {
      name: 'dts-auto-bundle',
      mri: {},
      mainColor: 'yellow',
      subColor: 'dim',
    })

    if (!this.launched) {
      args.showHelp()
    }
  }

  /**
   * Gathers current value of a particular CLI argument
   * @param arg argument name
   */
  protected getArgument(arg: ICliArgument) {
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

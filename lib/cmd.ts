import * as args from 'args'
import * as path from 'path'

export enum ICliArgument {
  root = 'root',
  tmp = 'tmp',
  tsc = 'tsc',
}

export class Cli {
  protected launched = false

  private args: {[name: string]: any} = {
    root: path.resolve(process.cwd()),
    tmp: path.resolve(process.cwd(), 'tmp'),
    tsc: '',
  }

  public constructor() {
    args
      .option(['r', 'root'], 'Root path of NPM package', this.args.root)
      .option(['t', 'tmp'], 'Cache directory', this.args.tmp)
      .option(['c', 'tsc'], 'Additional TSC options (unchecked pass-through)', this.args.tsc)
      .command('generate', 'Start generation', (name, sub, options) => {
        this.launched = true
        this.storeArguments(options)
      })
      .example('dts-auto-bundle -r . generate', 'Generates index.d.ts file and updates package.json for CWD.')

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

  protected getArgument(arg: ICliArgument) {
    return this.args[arg]
  }

  private storeArguments(passedArguments: any = this.args) {
    for (const argName of Object.keys(this.args)) {
      this.args[argName] = Object.is(passedArguments[argName], undefined)
        ? this.args[argName]
        : passedArguments[argName]
    }
  }
}

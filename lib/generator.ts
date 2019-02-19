import {readdirSync, statSync} from 'fs'
import {readFileSync} from 'fs'
import {sync as mkdir} from 'mkdirp'
import * as npmRun from 'npm-run'
import {join, resolve} from 'path'
import {sync as rm} from 'rimraf'
import {Cli, ICliArgument} from './cmd'

export class Generator extends Cli {
  public constructor() {
    super()
    this.generateTypings()
  }

  private getRoot() {
    return resolve(this.getArgument(ICliArgument.root))
  }

  private getCacheDir() {
    return resolve(this.getArgument(ICliArgument.cacheDir))
  }

  private resetCacheDir() {
    const cacheDir = this.getCacheDir()
    rm(cacheDir)
    mkdir(cacheDir)
  }

  private getDeclarationFiles(dir: string = this.getCacheDir(), files: string[] = []) {
    readdirSync(dir).forEach(file => {
      if (statSync(join(dir, file)).isDirectory()) {
        if (file !== 'node_modules') {
          files = this.getDeclarationFiles(join(dir, file), files)
        }
      } else {
        if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
          files = files.concat(join(dir, file))
        }
      }
    })

    return files
  }

  private generateTypings() {
    this.resetCacheDir()

    npmRun(
      `tsc --declaration --emitDeclarationOnly --declarationDir "${this.getCacheDir()}"`,
      {
        cwd: this.getRoot(),
      },
      (err: any, stdout: any, stderr: any) => {
        if (err) {
          process.stderr.write(`Error ocurred:\n${JSON.stringify(err)}`)
        }

        if (stdout) {
          process.stdout.write(stdout)
        }

        if (stderr) {
          process.stderr.write(stderr)
        }
      },
    )
  }
}

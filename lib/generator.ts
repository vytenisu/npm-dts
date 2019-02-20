import {readdirSync, statSync} from 'fs'
import {readFileSync} from 'fs'
import * as mkdir from 'mkdirp'
import * as npmRun from 'npm-run'
import {join, resolve} from 'path'
import * as rm from 'rimraf'
import {Cli, ICliArgument} from './cmd'

export class Generator extends Cli {
  public constructor() {
    super()

    this.generate().catch(error => {
      // TODO: NOT FINISHED
    })
  }

  private async generate() {
    await this.generateTypings()
    this.combineTypings()
  }

  private getRoot() {
    return resolve(this.getArgument(ICliArgument.root))
  }

  private getTempDir() {
    return resolve(this.getArgument(ICliArgument.tmp))
  }

  private makeTempDir(retries = 5) {
    return new Promise((done, fail) => {
      const cacheDir = this.getTempDir()

      mkdir(cacheDir, (mkdirError: any) => {
        if (mkdirError) {
          if (retries) {
            setTimeout(() => {
              this.makeTempDir(retries - 1).then(done, fail)
            }, 100)
          } else {
            fail()
          }
        } else {
          done()
        }
      })
    })
  }

  private clearTempDir() {
    return new Promise((done, fail) => {
      const tempDir = this.getTempDir()

      rm(tempDir, rmError => {
        if (rmError) {
          fail()
        } else {
          done()
        }
      })
    })
  }

  private resetCacheDir() {
    return new Promise((done, fail) => {
      this.clearTempDir().then(() => {
        this.makeTempDir().then(done, fail)
      }, fail)
    })
  }

  private async generateTypings() {
    await this.resetCacheDir()

    const tscOptions = this.getArgument(ICliArgument.tsc)

    const cmd =
      'tsc --declaration --emitDeclarationOnly --declarationDir ' +
      this.getTempDir() +
      (tscOptions.length ? ` ${tscOptions}` : '')

    npmRun.execSync(
      cmd,
      {
        cwd: this.getRoot(),
      },
      (err: any, stdout: any, stderr: any) => {
        if (err) {
          process.stderr.write(`Error ocurred:\n${JSON.stringify(err)}\n`)
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

  private getDeclarationFiles(dir: string = this.getTempDir(), files: string[] = []) {
    readdirSync(dir).forEach(file => {
      if (statSync(join(dir, file)).isDirectory()) {
        files = this.getDeclarationFiles(join(dir, file), files)
      } else {
        files = files.concat(join(dir, file))
      }
    })

    return files
  }

  private loadTypings() {
    const result: IDeclarationMap = {}

    this.getDeclarationFiles().forEach(file => {
      result[file] = readFileSync(file, {encoding: 'utf8'})
    })

    return result
  }

  private combineTypings() {
    const typings = this.loadTypings()
    this.clearTempDir()

    console.log(typings)
  }
}

export interface IDeclarationMap {
  [path: string]: string
}

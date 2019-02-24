export class C {
  public static test(text: IText) {
    process.stdout.write(`\nC: ${text}\n`)
  }
}

export type IText = string

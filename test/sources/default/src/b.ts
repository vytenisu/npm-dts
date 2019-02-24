import {C, IText} from './c'

export class B extends C {
  public static test(text: IText) {
    super.test(text)
    process.stdout.write(`\nB: ${text}\n`)
  }
}

export type ISuggestedText = string

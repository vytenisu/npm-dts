import {B, ISuggestedText} from './b'
import {IText} from './c'

export class A extends B {
  public static test(text: IText) {
    super.test(text)
    process.stdout.write(`\nA: ${text}\n`)
  }

  public static getText(): ISuggestedText {
    return 'test'
  }
}

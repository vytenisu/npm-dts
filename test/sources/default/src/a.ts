import * as winston from 'winston'
import {B} from './b'
import {IText} from './c'
import {ISuggestedText} from './interfaces'

export class A extends B {
  public static test(text: IText) {
    super.test(text)
    process.stdout.write(`\nA: ${text}\n`)
  }

  public static getText(): ISuggestedText {
    winston.warn('warn')
    return {value: 'test'}
  }
}

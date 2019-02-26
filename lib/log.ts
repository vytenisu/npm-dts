import * as winston from 'winston'
import {
  debug as winstonDebug,
  error as winstonError,
  info as winstonInfo,
  silly as winstonSilly,
  verbose as winstonVerbose,
  warn as winstonWarn,
} from 'winston'

winston.addColors({
  error: 'red',
  warn: 'yellow',
  info: 'cyan',
  debug: 'green',
})

let logEnabled = false

/**
 * Supported debug levels
 */
export enum ELogLevel {
  /**
   * Error
   */
  error = 'error',

  /**
   * Warning
   */
  warn = 'warn',

  /**
   * Information
   */
  info = 'info',

  /**
   * Verbose information
   */
  verbose = 'verbose',

  /**
   * Debug information
   */
  debug = 'debug',
}

/**
 * Logs error message
 * @param message Message to be logged
 */
export const error = (message: string) => {
  if (logEnabled) {
    return winstonError(message)
  } else {
    return null
  }
}

/**
 * Logs warning message
 * @param message Message to be logged
 */
export const warn = (message: string) => {
  if (logEnabled) {
    return winstonWarn(message)
  } else {
    return null
  }
}

/**
 * Logs informational message
 * @param message Message to be logged
 */
export const info = (message: string) => {
  if (logEnabled) {
    return winstonInfo(message)
  } else {
    return null
  }
}

/**
 * Logs verbose message
 * @param message Message to be logged
 */
export const verbose = (message: string) => {
  if (logEnabled) {
    return winstonVerbose(message)
  } else {
    return null
  }
}

/**
 * Logs debug message
 * @param message Message to be logged
 */
export const debug = (message: string) => {
  if (logEnabled) {
    return winstonDebug(message)
  } else {
    return null
  }
}

/**
 * Initializes and enables logging
 * @param label prefix to be used before each log line
 */
export const init = (label: string, level: ELogLevel) => {
  winston.configure({
    level,
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.label({label}),
      winston.format.timestamp(),
      winston.format.prettyPrint(),
      winston.format.printf(
        (parts: any) => `[${parts.label}] [${parts.level}] : ${parts.message}`,
      ),
    ),
    transports: [new winston.transports.Console()],
  })

  logEnabled = true
}

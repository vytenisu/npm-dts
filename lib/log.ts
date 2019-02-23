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

/**
 * Logs error message
 * @param message Message to be logged
 */
export const error = (message: string) => {
  return winstonError(message)
}

/**
 * Logs warning message
 * @param message Message to be logged
 */
export const warn = (message: string) => {
  return winstonWarn(message)
}

/**
 * Logs informational message
 * @param message Message to be logged
 */
export const info = (message: string) => {
  return winstonInfo(message)
}

/**
 * Logs verbose message
 * @param message Message to be logged
 */
export const verbose = (message: string) => {
  return winstonVerbose(message)
}

/**
 * Logs debug message
 * @param message Message to be logged
 */
export const debug = (message: string) => {
  return winstonDebug(message)
}

/**
 * Logs message of little importance
 * @param message Message to be logged
 */
export const silly = (message: string) => {
  return winstonSilly(message)
}

/**
 * Initializes logging
 * @param label prefix to be used before each log line
 */
export const init = (label: string) => {
  winston.configure({
    level: 'verbose',
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
}

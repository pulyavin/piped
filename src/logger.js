import {} from 'dotenv/config'
import { createLogger, format, transports } from 'winston'

const { combine, timestamp, printf } = format

const loggerFormat = printf(info => {
  return `${info.timestamp} [${info.level}]: ${info.message}`
})

const loggerPath = `{__dirname}/../storage/logs.txt`

const logger = createLogger({
  level: 'info',
  format: combine(timestamp(), loggerFormat),
  transports: [
    new transports.File({
      filename: loggerPath,
      level: 'error',
    }),
  ],
})

if (process.env.DEBUG) {
  logger.add(
    new transports.Console({
      format: loggerFormat,
    })
  )
}

export default logger

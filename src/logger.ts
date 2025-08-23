import { createLogger, format, transports } from 'winston';

// Create logger
export const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  exitOnError: false,
  exceptionHandlers: [
    new transports.File({
      filename: 'error.log',
      dirname: 'logs',
      tailable: true,
      maxsize: 1024 * 100
    }),
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
      level: process.env.APP_ENV === 'production' ? 'info' : 'debug'
    })
  ],
  transports: [
    new transports.File({
      filename: 'vivy.log',
      level: 'debug',
      dirname: 'logs',
      tailable: true,
      maxsize: 1024 * 100
    }),
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
      level: process.env.APP_ENV === 'production' ? 'info' : 'debug'
    })
  ]
});

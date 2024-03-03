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
  defaultMeta: { service: 'vivy' },
  transports: [
    new transports.File({ filename: 'error.log', level: 'error', dirname: 'logs' }),
    new transports.File({ filename: 'vivy.log', dirname: 'logs' }),
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
      level: process.env.APP_ENV === 'production' ? 'info' : 'debug'
    })
  ]
});

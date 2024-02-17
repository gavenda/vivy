import { createLogger, format, transports } from 'winston';

export const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json(),
  ),
  defaultMeta: { service: 'lumi' },
  transports: [
    new transports.File({ filename: 'error.log', level: 'error', dirname: 'logs' }),
    new transports.File({ filename: 'lumi.log', dirname: 'logs' }),
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    }),
  ],
});

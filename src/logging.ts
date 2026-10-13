import { getFileSink } from '@logtape/file';
import { ansiColorFormatter, configure, getConsoleSink, withFilter } from '@logtape/logtape';
import { AsyncLocalStorage } from 'node:async_hooks';

export const configureLogging = () =>
  configure({
    sinks: {
      console: withFilter(getConsoleSink({ nonBlocking: true, formatter: ansiColorFormatter }), 'info'),
      file: getFileSink('logs/vivy.log', {
        lazy: true,
        bufferSize: 8192,
        flushInterval: 5000,
        nonBlocking: true
      })
    },
    loggers: [
      { category: ['logtape', 'meta'], sinks: ['file'] },
      { category: 'vivy', lowestLevel: 'debug', sinks: ['console', 'file'] }
    ],
    contextLocalStorage: new AsyncLocalStorage()
  });

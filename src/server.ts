import { Server } from 'http';
import app from '@app';
import config from '@config/config';
import logger from '@core/utils/logger';
import errorHandler from 'core/utils/errorHandler';

const { port } = config;
const PORT = process.env.PORT || port;
const server: Server = app.listen(PORT, (): void => {
  logger.info(`Aapplication listens on PORT: ${PORT}`);
});

const exitHandler = (): void => {
  if (app) {
    server.close(() => {
      logger.info('Server closed');
      // eslint-disable-next-line no-process-exit
      process.exit(1);
    });
  } else {
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error: Error): void => {
  errorHandler.handleError(error);
  if (!errorHandler.isTrustedError(error)) {
    exitHandler();
  }
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', (reason: Error) => {
  throw reason;
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  if (server) {
    server.close();
  }
});

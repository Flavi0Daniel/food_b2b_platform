import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import routes from './routes';
import { notFoundMiddleware } from './common/middlewares/notFound.middleware';
import { errorMiddleware } from './common/middlewares/error.middleware';

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));

  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  app.get('/health', (_req, res) => {
    res.json({ success: true, message: 'API operacional', timestamp: new Date().toISOString() });
  });

  app.use('/api', routes);

  // Devem ser os ÚLTIMOS middlewares registados
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}

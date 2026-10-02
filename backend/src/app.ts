import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';
import { env } from './config/env';
import routes from './routes';
import { globalLimiter } from './common/middlewares/rateLimit.middleware';
import { notFoundMiddleware } from './common/middlewares/notFound.middleware';
import { errorMiddleware } from './common/middlewares/error.middleware';

export function createApp(): Application {
  const app = express();

  // Atrás de um proxy (Nginx, etc.) é necessário para o rate limit ver o IP real do cliente
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '10kb' }));
  app.use(hpp()); // impede HTTP Parameter Pollution (?a=1&a=2)

  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  app.get('/health', (_req, res) => {
    res.json({ success: true, message: 'API operacional', timestamp: new Date().toISOString() });
  });

  app.use('/api', globalLimiter, routes);

  // Devem ser os ÚLTIMOS middlewares registados
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}

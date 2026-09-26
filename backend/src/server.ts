import { createApp } from './app';
import { env } from './config/env';
import { checkDatabaseConnection } from './config/database';

async function bootstrap(): Promise<void> {
  await checkDatabaseConnection();

  const app = createApp();

  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 Servidor a correr em http://localhost:${env.PORT}`);
    // eslint-disable-next-line no-console
    console.log(`   Health check: http://localhost:${env.PORT}/health`);
  });
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('❌ Falha ao arrancar o servidor:', err);
  process.exit(1);
});

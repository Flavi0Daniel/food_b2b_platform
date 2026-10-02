import { createApp } from './app';
import { env } from './config/env';
import { checkDatabaseConnection } from './config/database';
import { startMaintenanceJobs } from './common/jobs/maintenance';
import { startEmailWorker } from './common/jobs/emailWorker';

async function bootstrap(): Promise<void> {
  await checkDatabaseConnection();

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 Servidor a correr em http://localhost:${env.PORT}`);
    // eslint-disable-next-line no-console
    console.log(`   Health check: http://localhost:${env.PORT}/health`);
  });

  // Timeouts curtos contra ligações lentas (Slowloris)
  server.headersTimeout = 15_000;
  server.requestTimeout = 30_000;
  server.keepAliveTimeout = 5_000;

  startMaintenanceJobs();
  startEmailWorker();
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('❌ Falha ao arrancar o servidor:', err);
  process.exit(1);
});

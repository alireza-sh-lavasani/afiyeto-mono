import Fastify from 'fastify';
import cors from '@fastify/cors';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import dotenv from 'dotenv';
import { initCouchDb } from './couch.js';
import { startCouchDaemon } from './couch-daemon.js';
import { registerRoutes } from './routes.js';

dotenv.config();

const PORT = parseInt(process.env.PORT || '5000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function bootstrap() {
  const app = Fastify({
    logger: {
      level: 'info',
    },
  });

  // Enable CORS matching the legacy app configuration
  await app.register(cors, {
    origin: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: '*',
    credentials: true,
  });

  // Setup Zod validation and serialization compilers
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  try {
    // 1. Initialize CouchDB Databases & Views
    await initCouchDb();

    // 2. Start the background Patient ID Reconciler daemon
    startCouchDaemon();

    // 3. Register HTTP routes
    await registerRoutes(app);

    // 4. Start HTTP Server
    await app.listen({ port: PORT, host: HOST });
    console.log(`[Backend] Server listening on http://${HOST}:${PORT}`);
  } catch (error) {
    app.log.error(error as any, 'Bootstrap failed');
    process.exit(1);
  }

  // Handle graceful shutdowns
  const shutdown = async () => {
    console.log('[Backend] Shutting down gracefully...');
    try {
      await app.close();
      console.log('[Backend] HTTP server closed.');
      process.exit(0);
    } catch (err) {
      console.error('[Backend] Error during shutdown:', err);
      process.exit(1);
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap();

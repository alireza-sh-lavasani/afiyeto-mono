import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';

const LoginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export async function registerRoutes(app: FastifyInstance) {
  const typeProviderApp = app.withTypeProvider<ZodTypeProvider>();

  // Root endpoint matching old backend
  typeProviderApp.get('/', async (request, reply) => {
    return 'Afiyet backend up and running!';
  });

  // Health check endpoint
  typeProviderApp.get('/health', async (request, reply) => {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  });

  // Auth endpoint placeholder for PouchDB integration
  typeProviderApp.post(
    '/auth/login',
    {
      schema: {
        body: LoginSchema,
      },
    },
    async (request, reply) => {
      const { username, password } = request.body;

      // Dummy authentication for now (extend as needed for CouchDB/Keycloak users)
      if (username === 'admin' && password === 'password') {
        return {
          success: true,
          token: 'dummy-jwt-token-for-sync',
          user: {
            id: 'admin',
            role: 'clinical-manager',
            name: 'Central Admin',
          },
        };
      }

      reply.status(401).send({
        success: false,
        message: 'Invalid credentials.',
      });
    }
  );
}

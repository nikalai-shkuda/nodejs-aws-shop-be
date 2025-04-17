import { FastifyInstance } from "fastify";
import { proxyRequest } from "../utils/proxy";

export async function importRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.all("/import", async (request, reply) => {
    const baseUrl = process.env.IMPORT_SERVICE_URL;

    if (!baseUrl) {
      return reply.status(502).send({ message: "Cannot process request" });
    }

    const targetUrl = `${baseUrl}/${request.url}`;
    await proxyRequest(targetUrl, request, reply);
  });
}

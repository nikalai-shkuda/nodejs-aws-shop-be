import { FastifyInstance } from "fastify";
import { proxyRequest } from "../utils/proxy";

export async function productRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.all("/products", async (request, reply) => {
    const baseUrl = process.env.PRODUCT_SERVICE_URL;

    if (!baseUrl) {
      return reply.status(502).send({ message: "Cannot process request" });
    }

    const targetUrl = `${baseUrl}/products`;
    await proxyRequest(targetUrl, request, reply);
  });
}

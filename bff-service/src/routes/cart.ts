import { FastifyInstance } from "fastify";
import { proxyRequest } from "../utils/proxy";

export async function cartRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.all("/cart", async (request, reply) => {
    const baseUrl = process.env.CART_SERVICE_URL;

    if (!baseUrl) {
      return reply.status(502).send({ message: "Cannot process request" });
    }

    const targetUrl = `${baseUrl}/profile/cart`;
    await proxyRequest(targetUrl, request, reply);
  });
}

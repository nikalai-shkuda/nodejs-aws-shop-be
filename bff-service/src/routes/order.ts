import { FastifyInstance } from "fastify";
import { proxyRequest } from "../utils/proxy";

export async function orderRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.all("/order", async (request, reply) => {
    const baseUrl = process.env.ORDER_SERVICE_URL;

    if (!baseUrl) {
      return reply.status(502).send({ message: "Cannot process request" });
    }

    const targetUrl = `${baseUrl}/profile/cart/order`;
    await proxyRequest(targetUrl, request, reply);
  });
}

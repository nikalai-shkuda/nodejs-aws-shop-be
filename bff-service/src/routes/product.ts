import { FastifyInstance } from "fastify";
import { getCachedData, setCacheData } from "../utils/cache";
import { proxyRequest } from "../utils/proxy";

const productsKey = "products";

export async function productRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.all("/products", async (request, reply) => {
    const baseUrl = process.env.PRODUCT_SERVICE_URL;

    if (!baseUrl) {
      return reply.status(502).send({ message: "Cannot process request" });
    }

    const cache = getCachedData(productsKey);

    if (request.method === "GET" && cache.fromCache) {
      fastify.log.info("Returning products from cache");
      return reply.code(200).send(cache.data);
    }

    const targetUrl = `${baseUrl}/products`;
    const response = await proxyRequest(targetUrl, request, reply);

    if (response.statusCode === 200) {
      setCacheData(productsKey, response.body);
    }
  });
}

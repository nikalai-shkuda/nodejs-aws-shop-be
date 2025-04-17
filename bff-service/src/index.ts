import fastifyCors from "@fastify/cors";
import dotenv from "dotenv";
import Fastify from "fastify";
import { cartRoutes } from "./routes/cart";
import { importRoutes } from "./routes/import";
import { orderRoutes } from "./routes/order";
import { productRoutes } from "./routes/product";

dotenv.config();

const fastify = Fastify({ logger: true });

fastify.register(cartRoutes);
fastify.register(importRoutes);
fastify.register(orderRoutes);
fastify.register(productRoutes);

const PORT = Number(process.env.PORT) || 4000;

const start = async () => {
  try {
    await fastify.register(fastifyCors, {
      origin: "*",
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    });

    fastify.get("/health", async () => ({ status: "ok" }));

    process.on("uncaughtException", (error, origin) => {
      fastify.log.info({ error, origin }, "Uncaught Exception:");
      process.exit(1);
    });

    process.on("unhandledRejection", (reason, promise) => {
      fastify.log.info({ promise, reason }, "Uncaught Exception:");
      process.exit(1);
    });

    await fastify.listen({ port: PORT, host: "0.0.0.0" });
    fastify.log.info(`BFF Service running at ${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

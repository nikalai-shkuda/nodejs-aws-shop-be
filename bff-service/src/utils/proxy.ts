import { FastifyReply, FastifyRequest } from "fastify";

type ProxyResponse = {
  statusCode: number;
  body: any;
};

export async function proxyRequest(
  url: string,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<ProxyResponse> {
  try {
    console.log("Proxy request: ", request);

    const { body, headers, method } = request;
    const cleanHeaders = { ...headers };
    delete cleanHeaders.host;
    delete cleanHeaders.connection;
    delete cleanHeaders["content-length"];

    const options = {
      method,
      headers: cleanHeaders as Record<string, string>,
      body: body ? JSON.stringify(body) : null,
    };

    const response = await fetch(url, options);
    const data = await response.json();

    reply.code(response.status).send(data);

    return {
      statusCode: response.status,
      body: data,
    };
  } catch (error) {
    console.log(`Proxy error for ${url}`, { error, request });
    reply.code(500).send({ error: "Failed to connect to service" });
    return {
      statusCode: 500,
      body: null,
    };
  }
}

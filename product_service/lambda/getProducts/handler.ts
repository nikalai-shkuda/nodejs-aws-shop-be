import { APIGatewayProxyResult, Handler } from "aws-lambda";
import { commonHeaders } from "/opt/nodejs/headers";
import { products } from "/opt/nodejs/mock";

export const getProducts: Handler =
  async (): Promise<APIGatewayProxyResult> => {
    try {
      return {
        body: JSON.stringify(products || []),
        headers: commonHeaders,
        statusCode: 200,
      };
    } catch (error) {
      console.error("Error fetching product:", error);
      return {
        body: JSON.stringify({
          message:
            error instanceof Error ? error?.message : "Internal Server Error",
        }),
        headers: commonHeaders,
        statusCode: 500,
      };
    }
  };

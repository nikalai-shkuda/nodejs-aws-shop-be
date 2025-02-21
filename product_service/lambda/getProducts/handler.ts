import { APIGatewayProxyResult, Handler } from "aws-lambda";
// @ts-ignore
import { Product } from "/opt/nodejs/types";

const commonHeaders = require("/opt/nodejs/commonHeaders");
const products: Product[] = require("/opt/nodejs/products");

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

import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Handler,
} from "aws-lambda";
// @ts-ignore
import { Product } from "/opt/nodejs/types";

const commonHeaders = require("/opt/nodejs/commonHeaders");
const products: Product[] = require("/opt/nodejs/products");

export const getProductsById: Handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { productId } = event.pathParameters || {};
    const product = products.find((el: Product) => el?.id === productId);

    if (!product) {
      return {
        body: JSON.stringify({ message: "Product not found" }),
        headers: commonHeaders,
        statusCode: 404,
      };
    }

    return {
      body: JSON.stringify(product),
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

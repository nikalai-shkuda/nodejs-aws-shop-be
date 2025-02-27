import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Handler,
} from "aws-lambda";
import { commonHeaders } from "/opt/nodejs/headers";
import { Product } from "/opt/nodejs/types";
import { products } from "/opt/nodejs/mock";

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

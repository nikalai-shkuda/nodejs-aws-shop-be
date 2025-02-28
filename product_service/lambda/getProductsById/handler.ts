import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Handler,
} from "aws-lambda";
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { commonHeaders } from "/opt/nodejs/headers";
import { handleError } from "../../utils/responseError";

export const getProductsById: Handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    console.log("getProductsById invoked", {
      pathParameters: event.pathParameters,
    });
    const { productId } = event.pathParameters || {};
    if (!productId) {
      return handleError({
        message: "Product ID is required",
        statusCode: 400,
      });
    }

    const client = new DynamoDBClient({});
    const productsTable = process.env.PRODUCTS_TABLE;
    const stocksTable = process.env.STOCKS_TABLE;

    const product = await client.send(
      new GetItemCommand({
        TableName: productsTable,
        Key: { id: { S: productId ?? "" } },
      })
    );

    if (!product?.Item) {
      return handleError({ message: "Product not found", statusCode: 404 });
    }

    const stock = await client.send(
      new GetItemCommand({
        TableName: stocksTable,
        Key: { product_id: { S: productId ?? "" } },
      })
    );

    const finalProduct = {
      id: product.Item.id.S,
      description: product.Item?.description?.S,
      price: Number(product.Item?.price?.N),
      title: product.Item?.title?.S,
      count: stock.Item ? Number(stock.Item?.count?.N) : 0,
    };

    console.log("Fetched product:", product);
    return {
      body: JSON.stringify(finalProduct),
      headers: commonHeaders,
      statusCode: 200,
    };
  } catch (error) {
    return handleError({ error, message: "Error fetching product" });
  }
};

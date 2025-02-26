import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Handler,
} from "aws-lambda";
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { commonHeaders } from "/opt/nodejs/headers";

export const getProductsById: Handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { productId } = event.pathParameters || {};
    const client = new DynamoDBClient({ region: process.env.REGION });
    const productsTable = process.env.PRODUCTS_TABLE;
    const stocksTable = process.env.STOCKS_TABLE;

    const product = await client.send(
      new GetItemCommand({
        TableName: productsTable,
        Key: { id: { S: productId ?? "" } },
      })
    );

    if (!product?.Item) {
      return {
        body: JSON.stringify({ message: "Product not found" }),
        headers: commonHeaders,
        statusCode: 404,
      };
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
    console.log({ product, stock, finalProduct });

    return {
      body: JSON.stringify(finalProduct),
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

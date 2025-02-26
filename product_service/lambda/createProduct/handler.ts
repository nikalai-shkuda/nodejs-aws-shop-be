import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Handler,
} from "aws-lambda";
import { commonHeaders } from "/opt/nodejs/headers";
import { v4 as uuidv4 } from "uuid";

export const createProduct: Handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const body = event.body ? JSON.parse(event.body) : null;
    console.log("createProduct", { event });

    if (!body) {
      return {
        statusCode: 400,
        headers: commonHeaders,
        body: JSON.stringify({ message: "Invalid request body" }),
      };
    }
    const { description, count, price, title } = body;
    const id = uuidv4();
    const client = new DynamoDBClient({ region: process.env.REGION });

    if (!description || !count || !price || !title) {
      return {
        statusCode: 400,
        headers: commonHeaders,
        body: JSON.stringify({ message: "Missing required fields" }),
      };
    }

    await client.send(
      new PutItemCommand({
        TableName: process.env.PRODUCTS_TABLE,
        Item: {
          description: { S: description },
          id: { S: id },
          price: { N: price.toString() },
          title: { S: title },
        },
      })
    );

    await client.send(
      new PutItemCommand({
        TableName: process.env.STOCKS_TABLE,
        Item: { product_id: { S: id }, count: { N: count.toString() } },
      })
    );

    return {
      body: JSON.stringify({ count, description, id, price, title }),
      headers: commonHeaders,
      statusCode: 201,
    };
  } catch (error) {
    console.error("Error create product:", error);
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

import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Handler,
} from "aws-lambda";
import { commonHeaders } from "/opt/nodejs/headers";
import { v4 as uuidv4 } from "uuid";
import { handleError } from "../../utils/responseError";

export const createProduct: Handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    console.log("createProduct invoked", { eventBody: event.body });
    const body = event.body ? JSON.parse(event.body) : {};
    const { description, count, price, title } = body;

    if (
      !description ||
      typeof description !== "string" ||
      !title ||
      typeof title !== "string" ||
      !price ||
      typeof price !== "number" ||
      !count ||
      typeof count !== "number"
    ) {
      return handleError({ message: "Invalid request body", statusCode: 400 });
    }

    const id = uuidv4();
    const client = new DynamoDBClient();
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

    console.log("Product created successfully", {
      id,
      title,
      description,
      price,
      count,
    });

    return {
      body: JSON.stringify({ count, description, id, price, title }),
      headers: commonHeaders,
      statusCode: 201,
    };
  } catch (error) {
    return handleError({ error, message: "Error creating product" });
  }
};

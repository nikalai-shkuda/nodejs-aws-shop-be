import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
  TransactWriteCommandInput,
} from "@aws-sdk/lib-dynamodb";
import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Handler,
} from "aws-lambda";
import { commonHeaders } from "/opt/nodejs/headers";
import { v4 as uuidv4 } from "uuid";
import { Product, ProductRequest, Stock } from "../../src/types/products";
import { handleError } from "../../utils/responseError";

const client = new DynamoDBClient();
const dynamodb = DynamoDBDocumentClient.from(client);
const productsTable = process.env.PRODUCTS_TABLE;
const stocksTable = process.env.STOCKS_TABLE;

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
    const product: Product = {
      id,
      title,
      description,
      price,
    };
    const stock: Stock = {
      product_id: id,
      count,
    };
    const createdProduct: ProductRequest = {
      ...product,
      count: stock.count,
    };
    const transaction: TransactWriteCommandInput = {
      TransactItems: [
        {
          Put: {
            TableName: productsTable,
            Item: product,
          },
        },
        {
          Put: {
            TableName: stocksTable,
            Item: stock,
          },
        },
      ],
    };

    await dynamodb.send(new TransactWriteCommand(transaction));

    console.log("Product created successfully", createdProduct);
    return {
      body: JSON.stringify(createdProduct),
      headers: commonHeaders,
      statusCode: 201,
    };
  } catch (error) {
    return handleError({ error, message: "Error creating product" });
  }
};

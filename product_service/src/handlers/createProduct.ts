import {
  TransactWriteCommand,
  TransactWriteCommandInput,
} from "@aws-sdk/lib-dynamodb";
import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Handler,
} from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import { Product, ProductRequest, Stock } from "../types/products";
import { dynamodbClient } from "../utils/dbClient";
import { handleError } from "../utils/responseError";
import { response } from "../utils/responseSuccessful";

const productsTable = process.env.PRODUCTS_TABLE;
const stocksTable = process.env.STOCKS_TABLE;

export const handler: Handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    console.log("createProduct invoked", { eventBody: event.body });
    const body = event.body ? JSON.parse(event.body) : {};
    const { description, count, imageUrl, price, title } = body;

    if (
      !description ||
      typeof description !== "string" ||
      !title ||
      typeof title !== "string" ||
      !price ||
      typeof price !== "number" ||
      !count ||
      typeof count !== "number" ||
      !imageUrl ||
      typeof imageUrl !== "string"
    ) {
      return handleError({ message: "Invalid request body", statusCode: 400 });
    }

    const id = uuidv4();
    const product: Product = {
      id,
      imageUrl,
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

    await dynamodbClient.send(new TransactWriteCommand(transaction));

    console.log("Product created successfully", createdProduct);
    return response(201, createdProduct);
  } catch (error) {
    return handleError({ error, message: "Error creating product" });
  }
};

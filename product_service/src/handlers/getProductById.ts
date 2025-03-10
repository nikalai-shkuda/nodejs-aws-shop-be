import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Handler,
} from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { Product, Stock } from "../types/products";
import { handleError } from "../utils/responseError";
import { response } from "../utils/responseSuccessful";

const productsTable = process.env.PRODUCTS_TABLE;
const stocksTable = process.env.STOCKS_TABLE;

export const handler: Handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    console.log("getProductById invoked", {
      pathParameters: event.pathParameters,
    });
    const { productId } = event.pathParameters || {};
    if (!productId) {
      return handleError({
        message: "Product ID is required",
        statusCode: 400,
      });
    }

    const client = new DynamoDBClient();
    const dynamodb = DynamoDBDocumentClient.from(client);

    const [productResponse, stockResponse] = await Promise.all([
      dynamodb.send(
        new GetCommand({
          TableName: productsTable,
          Key: { id: productId },
        })
      ),
      dynamodb.send(
        new GetCommand({
          TableName: stocksTable,
          Key: { product_id: productId },
        })
      ),
    ]);

    const product: Product = (productResponse.Item as Product) || {};
    const stock: Stock = (stockResponse.Item as Stock) || { count: 0 };
    if (!productResponse.Item) {
      return handleError({
        message: "Product not found",
        statusCode: 404,
      });
    }

    const resultProduct = {
      ...product,
      count: stock.count,
    };

    console.log("Fetched product:", resultProduct);
    return response(200, resultProduct);
  } catch (error) {
    return handleError({ error, message: "Error fetching product" });
  }
};

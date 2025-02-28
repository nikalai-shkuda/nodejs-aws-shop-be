import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Handler,
} from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { commonHeaders } from "/opt/nodejs/headers";
import { Product, Stock } from "../../src/types/products";
import { handleError } from "../../utils/responseError";

const client = new DynamoDBClient();
const dynamodb = DynamoDBDocumentClient.from(client);
const productsTable = process.env.PRODUCTS_TABLE;
const stocksTable = process.env.STOCKS_TABLE;

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
    return {
      body: JSON.stringify(resultProduct),
      headers: commonHeaders,
      statusCode: 200,
    };
  } catch (error) {
    return handleError({ error, message: "Error fetching product" });
  }
};

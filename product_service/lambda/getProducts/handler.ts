import { APIGatewayProxyResult, Handler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { commonHeaders } from "/opt/nodejs/headers";
import { Product, Stock } from "../../src/types/products";
import { handleError } from "../../utils/responseError";

const client = new DynamoDBClient();
const dynamodb = DynamoDBDocumentClient.from(client);
const productsTable = process.env.PRODUCTS_TABLE;
const stocksTable = process.env.STOCKS_TABLE;

export const getProducts: Handler =
  async (): Promise<APIGatewayProxyResult> => {
    try {
      console.log("getProducts invoked");
      const [productsResponse, stocksResponse] = await Promise.all([
        dynamodb.send(new ScanCommand({ TableName: productsTable })),
        dynamodb.send(new ScanCommand({ TableName: stocksTable })),
      ]);

      const products: Product[] = (productsResponse.Items as Product[]) || [];
      const stocks: Stock[] = (stocksResponse.Items as Stock[]) || [];

      const formatedStocks =
        stocks.reduce((acc: { [id: string]: number }, stock) => {
          const id = stock.product_id;
          const count = Number(stock.count);
          acc[id] = count;
          return acc;
        }, {}) || {};

      const finalProducts = products.map((product) => ({
        ...product,
        count: formatedStocks[product.id] || 0,
      }));

      console.log("Fetched products:", finalProducts);
      return {
        body: JSON.stringify(finalProducts),
        headers: commonHeaders,
        statusCode: 200,
      };
    } catch (error) {
      return handleError({ error, message: "Error fetching products" });
    }
  };

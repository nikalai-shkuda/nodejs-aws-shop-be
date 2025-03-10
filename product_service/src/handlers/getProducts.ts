import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyResult, Handler } from "aws-lambda";
import { Product, Stock } from "../types/products";
import { dynamodbClient } from "../utils/dbClient";
import { handleError } from "../utils/responseError";
import { response } from "../utils/responseSuccessful";

const productsTable = process.env.PRODUCTS_TABLE;
const stocksTable = process.env.STOCKS_TABLE;

export const handler: Handler = async (): Promise<APIGatewayProxyResult> => {
  try {
    console.log("getProducts invoked");
    const [productsResponse, stocksResponse] = await Promise.all([
      dynamodbClient.send(new ScanCommand({ TableName: productsTable })),
      dynamodbClient.send(new ScanCommand({ TableName: stocksTable })),
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
    return response(200, finalProducts);
  } catch (error) {
    return handleError({ error, message: "Error fetching products" });
  }
};

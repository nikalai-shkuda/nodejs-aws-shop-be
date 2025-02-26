import { APIGatewayProxyResult, Handler } from "aws-lambda";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { commonHeaders } from "/opt/nodejs/headers";

export const getProducts: Handler =
  async (): Promise<APIGatewayProxyResult> => {
    try {
      const client = new DynamoDBClient({ region: process.env.REGION });
      const productsTable = process.env.PRODUCTS_TABLE;
      const stocksTable = process.env.STOCKS_TABLE;

      const productsResponse = await client.send(
        new ScanCommand({ TableName: productsTable })
      );
      const stocksResponse = await client.send(
        new ScanCommand({ TableName: stocksTable })
      );

      const products =
        productsResponse.Items?.map((p) => ({
          id: p.id?.S || "",
          title: p.title?.S,
          description: p.description?.S,
          price: p.price?.N ? Number(p.price.N) : 0,
        })) || [];

      const stocks =
        stocksResponse.Items?.reduce((acc: { [id: string]: number }, stock) => {
          const id = stock.product_id?.S || "";
          const count = stock.count?.N ? Number(stock.count.N) : 0;
          acc[id] = count;
          return acc;
        }, {}) || {};

      const finalProducts = products.map((product) => ({
        ...product,
        count: stocks[product.id] || 0,
      }));

      console.log({ products, stocks, finalProducts });

      return {
        body: JSON.stringify(finalProducts),
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

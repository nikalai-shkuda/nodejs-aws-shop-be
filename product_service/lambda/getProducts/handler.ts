import { APIGatewayProxyResult, Handler } from "aws-lambda";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { commonHeaders } from "/opt/nodejs/headers";
import { handleError } from "../../utils/responseError";

export const getProducts: Handler =
  async (): Promise<APIGatewayProxyResult> => {
    try {
      console.log("getProducts invoked");
      const client = new DynamoDBClient();
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

const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
import { config } from "../config";
import { Product, Stock } from "../types/products";

const client = new DynamoDBClient({ region: config.region });

const products: Product[] = [
  {
    description: "Short Product Description 1",
    id: "7567ec4b-b10c-48c5-9345-fc73c48a80aa",
    price: 24,
    title: "Product 1",
  },
  {
    description: "Short Product Description 2",
    id: "7567ec4b-b10c-48c5-9345-fc73c48a80a1",
    price: 15,
    title: "Product 21",
  },
];

const stocks: Stock[] = products.map((product) => ({
  product_id: product.id,
  count: Math.floor(Math.random() * 10) + 1,
}));

async function populateDB(): Promise<void> {
  for (const product of products) {
    await client.send(
      new PutItemCommand({
        TableName: config.productsTableName,
        Item: {
          id: { S: product.id },
          title: { S: product.title },
          description: { S: product.description },
          price: { N: product.price.toString() },
        },
      })
    );
  }

  for (const stock of stocks) {
    await client.send(
      new PutItemCommand({
        TableName: config.stocksTableName,
        Item: {
          product_id: { S: stock.product_id },
          count: { N: stock.count.toString() },
        },
      })
    );
  }

  console.log("Database populated successfully!");
}

populateDB();

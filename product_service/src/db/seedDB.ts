import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { config } from "../config";
import { Product, Stock } from "../types/products";
import { dynamodbClient } from "../utils/dbClient";

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
    await dynamodbClient.send(
      new PutCommand({
        TableName: config.productsTableName,
        Item: {
          ...product,
          price: product.price.toString(),
        },
      })
    );
  }

  for (const stock of stocks) {
    await dynamodbClient.send(
      new PutCommand({
        TableName: config.stocksTableName,
        Item: {
          ...stock,
          count: stock.count.toString(),
        },
      })
    );
  }

  console.log("Database populated successfully!");
}

populateDB();

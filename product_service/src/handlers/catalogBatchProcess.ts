import { SQSEvent } from "aws-lambda";
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import {
  TransactWriteCommand,
  TransactWriteCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { ZodError } from "zod";
import { config } from "../config";
import { Product, Stock } from "../types/products";
import { dynamodbClient } from "../utils/dbClient";
import { handleError, serverErrorType } from "../utils/responseError";
import {
  createProductFromCsvSchema,
  productSchema,
  stockSchema,
} from "../utils/schemas";

const snsClient = new SNSClient({ region: config.region });
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN || "";

export const handler = async (
  event: SQSEvent
): Promise<void | serverErrorType> => {
  try {
    for (const record of event.Records) {
      const parsedProduct = JSON.parse(record.body);
      const validatedParsedProduct =
        createProductFromCsvSchema.parse(parsedProduct);
      const id = uuidv4();
      const product: Product = productSchema.parse({
        id,
        imageUrl: validatedParsedProduct.imageUrl,
        description: validatedParsedProduct.description,
        price: Number(validatedParsedProduct.price),
        title: validatedParsedProduct.title,
      });
      const stock: Stock = stockSchema.parse({
        product_id: id,
        count: Number(validatedParsedProduct.count),
      });

      console.log("Processing batch product:", {
        product,
        stock,
      });
      await saveProductToDynamoDB(product, stock);
      await sendEmailNotification(product);
    }
  } catch (error) {
    if (error instanceof ZodError) {
      return handleError({
        message: "Validation error",
        error: error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
        statusCode: 400,
      });
    }
    return handleError({ error, message: "Error processing batch" });
  }
};

async function saveProductToDynamoDB(
  product: Product,
  stock: Stock
): Promise<void | serverErrorType> {
  try {
    const transaction: TransactWriteCommandInput = {
      TransactItems: [
        {
          Put: {
            TableName: config.productsTableName,
            Item: product,
          },
        },
        {
          Put: {
            TableName: config.stocksTableName,
            Item: stock,
          },
        },
      ],
    };
    await dynamodbClient.send(new TransactWriteCommand(transaction));
    console.log(`Product added: ${product.id}`);
  } catch (error) {
    return handleError({ error, message: "Error saving product" });
  }
}

async function sendEmailNotification(
  product: Product
): Promise<void | serverErrorType> {
  try {
    const command = new PublishCommand({
      TopicArn: SNS_TOPIC_ARN,
      Message: `New product created: ${product.title} (ID: ${product.id})`,
      MessageAttributes: {
        price: {
          DataType: "Number",
          StringValue: product.price.toString(),
        },
      },
      Subject: "Added new product to DB",
    });
    await snsClient.send(command);
    console.log(`Sent email notification for product: ${product.id}`);
  } catch (error) {
    return handleError({ error, message: "Error sending email" });
  }
}

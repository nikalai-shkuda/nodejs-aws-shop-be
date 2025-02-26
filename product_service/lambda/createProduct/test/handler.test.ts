import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { Context } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { createProduct } from "../index";

const dynamoMock = mockClient(DynamoDBClient);

describe("createProduct Lambda", () => {
  beforeEach(() => {
    dynamoMock.reset();
  });

  const context = {} as Context;
  const cb = () => {};
  const product = {
    description: "Test Product",
    count: 10,
    price: 20,
    title: "Sample",
  };

  it("should create a product successfully", async () => {
    dynamoMock.on(PutItemCommand).resolves({});

    const event = {
      body: JSON.stringify(product),
    };
    const result = await createProduct(event, context, cb);

    expect(result.statusCode).toBe(201);
    expect(JSON.parse(result.body)).toMatchObject(product);
  });

  it("should return 400 if request body is missing", async () => {
    const event = { body: "" };
    const result = await createProduct(event, context, cb);

    expect(result.statusCode).toBe(400);
  });

  it("should return 500 if DynamoDB call fails", async () => {
    dynamoMock.on(PutItemCommand).rejects(new Error("DynamoDB error"));

    const event = {
      body: JSON.stringify(product),
    };
    const result = await createProduct(event, context, cb);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).message).toBe("DynamoDB error");
  });
});

import { PutItemCommand } from "@aws-sdk/client-dynamodb";
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { SQSEvent } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { config } from "../../config";
import { dynamodbClient } from "../../utils/dbClient";
import { handler } from "../catalogBatchProcess";

const mockUUID = "b3ca6925-ada8-493b-84d4-5e995761f75b";

jest.mock("uuid", () => ({
  v4: () => mockUUID,
}));

const snsMock = mockClient(SNSClient);
const dynamoDbMock = mockClient(dynamodbClient);

describe("catalogBatchProcess handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    snsMock.reset();
    dynamoDbMock.reset();
  });

  const mockSQSEvent = {
    Records: [
      {
        body: JSON.stringify({
          title: "Test Product",
          description: "Test Description",
          price: "200",
          count: "5",
        }),
      },
    ],
  };

  it("should store products in DynamoDB and send SNS notifications", async () => {
    dynamoDbMock.on(PutItemCommand).resolves({});
    snsMock.on(PublishCommand).resolves({});
    process.env.SNS_TOPIC_ARN = "test-topic-arn";

    const mockEvent: SQSEvent = {
      Records: [
        {
          body: JSON.stringify({
            id: mockUUID,
            title: "Test Product",
            description: "Test description",
            price: "200",
            count: "20",
          }),
        },
      ],
    } as any;

    await handler(mockEvent);

    expect(snsMock.commandCalls(PublishCommand).length).toBe(1);
  });

  it("should process SQS event and create product successfully", async () => {
    const result = await handler(mockSQSEvent as any);

    // Verify DynamoDB transaction was called
    const dynamoDbCalls = dynamoDbMock.commandCalls(TransactWriteCommand);
    expect(dynamoDbCalls).toHaveLength(1);

    const firstCall = dynamoDbCalls[0];
    expect(firstCall.args[0].input).toEqual({
      TransactItems: [
        {
          Put: {
            TableName: config.productsTableName,
            Item: {
              id: mockUUID,
              title: "Test Product",
              description: "Test Description",
              price: 200,
            },
          },
        },
        {
          Put: {
            TableName: config.stocksTableName,
            Item: {
              product_id: mockUUID,
              count: 5,
            },
          },
        },
      ],
    });

    // Verify SNS notification
    const snsCalls = snsMock.commandCalls(PublishCommand);
    expect(snsCalls).toHaveLength(1);
    expect(snsCalls[0].args[0].input).toEqual({
      TopicArn: "",
      Message: `New product created: Test Product (ID: ${mockUUID})`,
      MessageAttributes: {
        price: {
          DataType: "Number",
          StringValue: "200",
        },
      },
      Subject: "Added new product to DB",
    });
  });

  it("should handle multiple records in SQS event", async () => {
    const multipleRecordsEvent = {
      Records: [
        {
          body: JSON.stringify({
            title: "Product 1",
            description: "Description 1",
            price: "200",
            count: "5",
          }),
        },
        {
          body: JSON.stringify({
            title: "Product 2",
            description: "Description 2",
            price: "200",
            count: "10",
          }),
        },
      ],
    };

    await handler(multipleRecordsEvent as any);

    expect(dynamoDbMock.commandCalls(TransactWriteCommand)).toHaveLength(2);
    expect(snsMock.commandCalls(PublishCommand)).toHaveLength(2);
  });

  it("should handle invalid JSON in SQS message", async () => {
    const invalidJsonEvent = {
      Records: [
        {
          body: "invalid-json",
        },
      ],
    };

    const result = await handler(invalidJsonEvent as any);

    expect(result).toBeDefined();
    expect(result?.statusCode).toBe(500);
    expect(dynamoDbMock.commandCalls(TransactWriteCommand)).toHaveLength(0);
    expect(snsMock.commandCalls(PublishCommand)).toHaveLength(0);
  });

  it("should handle validation error", async () => {
    const invalidDataEvent = {
      Records: [
        {
          body: JSON.stringify({
            title: "Test Product",
            description: "Test Description",
            price: "invalid-price",
            count: "5",
          }),
        },
      ],
    };

    const result = await handler(invalidDataEvent as any);

    expect(result).toBeDefined();
    expect(result?.statusCode).toBe(400);
    expect(dynamoDbMock.commandCalls(TransactWriteCommand)).toHaveLength(0);
    expect(snsMock.commandCalls(PublishCommand)).toHaveLength(0);
  });
});

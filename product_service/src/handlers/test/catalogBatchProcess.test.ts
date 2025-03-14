import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { SQSEvent } from "aws-lambda";
import { config } from "../../config";
import { dynamodbClient } from "../../utils/dbClient";
import { handler } from "../catalogBatchProcess";

jest.mock("@aws-sdk/client-sns");
jest.mock("../../utils/dbClient");
jest.mock("uuid", () => ({ v4: jest.fn(() => "mock-uuid") }));

const mockSQSEvent: SQSEvent = {
  Records: [
    {
      body: JSON.stringify({
        title: "Test Product",
        description: "Test Description",
        price: 100,
        count: 5,
      }),
    },
  ],
} as any;
const mockSNSClient = new SNSClient({});

describe("catalogBatchProcess handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (dynamodbClient.send as jest.Mock).mockResolvedValue({});
    (SNSClient.prototype.send as jest.Mock).mockResolvedValue({});
  });

  it("should process SQS event and create product successfully", async () => {
    await handler(mockSQSEvent);

    expect(dynamodbClient.send).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          TransactItems: [
            {
              Put: {
                TableName: config.productsTableName,
                Item: {
                  id: "mock-uuid",
                  title: "Test Product",
                  description: "Test Description",
                  price: 100,
                },
              },
            },
            {
              Put: {
                TableName: config.stocksTableName,
                Item: {
                  product_id: "mock-uuid",
                  count: 5,
                },
              },
            },
          ],
        },
      })
    );
    expect(mockSNSClient.send).toHaveBeenCalledWith(expect.any(PublishCommand));
  });

  it("should handle multiple records in SQS event", async () => {
    const multipleRecordsEvent = {
      Records: [mockSQSEvent.Records[0], mockSQSEvent.Records[0]],
    };

    await handler(multipleRecordsEvent as SQSEvent);

    expect(dynamodbClient.send).toHaveBeenCalledTimes(2);
    expect(SNSClient.prototype.send).toHaveBeenCalledTimes(2);
  });

  it("should handle invalid JSON in SQS message", async () => {
    const invalidEvent: SQSEvent = {
      Records: [
        {
          ...mockSQSEvent.Records[0],
          body: "invalid json",
        },
      ],
    };

    console.error = jest.fn();

    await handler(invalidEvent);

    expect(console.error).toHaveBeenCalled();
    expect(dynamodbClient.send).not.toHaveBeenCalled();
    expect(SNSClient.prototype.send).not.toHaveBeenCalled();
  });

  it("should handle DynamoDB transaction failure", async () => {
    (dynamodbClient.send as jest.Mock).mockRejectedValue(new Error("DB Error"));
    console.error = jest.fn();

    await handler(mockSQSEvent);

    expect(console.error).toHaveBeenCalled();
    expect(SNSClient.prototype.send).not.toHaveBeenCalled();
  });

  it("should handle SNS publish failure", async () => {
    (SNSClient.prototype.send as jest.Mock).mockRejectedValue(
      new Error("SNS Error")
    );
    console.error = jest.fn();

    await handler(mockSQSEvent);

    expect(console.error).toHaveBeenCalled();
    expect(dynamodbClient.send).toHaveBeenCalled();
  });
});

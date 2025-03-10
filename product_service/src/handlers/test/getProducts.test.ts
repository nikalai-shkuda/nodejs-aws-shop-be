import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Context } from "aws-lambda";
import { handler } from "../getProducts";

jest.mock("@aws-sdk/client-dynamodb");
jest.mock("@aws-sdk/lib-dynamodb");

describe("getProducts handler", () => {
  const mockProducts = [
    { id: "1", title: "Product 1", price: 100 },
    { id: "2", title: "Product 2", price: 200 },
  ];
  const mockStocks = [
    { product_id: "1", count: 5 },
    { product_id: "2", count: 10 },
  ];
  const expectedResponse = [
    { id: "1", title: "Product 1", price: 100, count: 5 },
    { id: "2", title: "Product 2", price: 200, count: 10 },
  ];
  const event = {};
  const context = {} as Context;
  const cb = () => {};

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully fetch and combine products with stocks", async () => {
    const mockSend = jest.fn();
    mockSend
      .mockImplementationOnce(() => Promise.resolve({ Items: mockProducts }))
      .mockImplementationOnce(() => Promise.resolve({ Items: mockStocks }));

    (DynamoDBDocumentClient.from as jest.Mock).mockReturnValue({
      send: mockSend,
    });

    const result = await handler(event, context, cb);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual(expectedResponse);
    expect(result.headers).toBeDefined();
  });

  it("should handle empty products and stocks", async () => {
    const mockSend = jest.fn();
    mockSend
      .mockImplementationOnce(() => Promise.resolve({ Items: [] }))
      .mockImplementationOnce(() => Promise.resolve({ Items: [] }));

    (DynamoDBDocumentClient.from as jest.Mock).mockReturnValue({
      send: mockSend,
    });

    const result = await handler(event, context, cb);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual([]);
  });

  it("should handle DynamoDB errors", async () => {
    const mockError = new Error("DynamoDB error");
    const mockSend = jest.fn().mockRejectedValue(mockError);

    (DynamoDBDocumentClient.from as jest.Mock).mockReturnValue({
      send: mockSend,
    });

    const result = await handler(event, context, cb);

    expect(result.statusCode).toBe(500);
  });
});

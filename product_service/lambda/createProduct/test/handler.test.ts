import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { Context } from "aws-lambda";
import { createProduct } from "../index";

jest.mock("@aws-sdk/client-dynamodb");
jest.mock("@aws-sdk/lib-dynamodb", () => {
  const actualLib = jest.requireActual("@aws-sdk/lib-dynamodb");
  return {
    ...actualLib,
    DynamoDBDocumentClient: {
      from: jest.fn((client) => ({
        send: jest.fn(),
      })),
    },
    TransactWriteCommand: jest.fn(),
  };
});
jest.mock("uuid", () => ({ v4: jest.fn(() => "test-uuid") }));

describe("createProduct Lambda Function", () => {
  const context = {} as Context;
  const cb = () => {};

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully create a product", async () => {
    const mockSend = jest.fn();
    mockSend.mockResolvedValueOnce({});

    const product = {
      title: "Test Product",
      description: "Test Description",
      price: 100,
      count: 5,
    };

    const event = {
      body: JSON.stringify(product),
    };
    const response = await createProduct(event, context, cb);

    expect(response.statusCode).toBe(201);
    expect(JSON.parse(response.body)).toEqual({
      ...product,
      id: "test-uuid",
    });
    expect(TransactWriteCommand).toHaveBeenCalledTimes(1);
  });

  it("should return 400 if request body is invalid", async () => {
    const mockSend = jest.fn();
    const event = {
      body: JSON.stringify({ title: "Test Product" }),
    };
    const response = await createProduct(event, context, cb);

    expect(response.statusCode).toBe(400);
    expect(mockSend).not.toHaveBeenCalled();
  });
});

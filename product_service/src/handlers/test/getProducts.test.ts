import { Context } from "aws-lambda";
import { handler } from "../getProducts";
import { dynamodbClient } from "../../utils/dbClient";

jest.mock("../../utils/dbClient", () => ({
  dynamodbClient: {
    send: jest.fn(),
  },
}));

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

  it("should return products with stocks", async () => {
    (dynamodbClient.send as jest.Mock)
      .mockImplementationOnce(() => Promise.resolve({ Items: mockProducts }))
      .mockImplementationOnce(() => Promise.resolve({ Items: mockStocks }));

    const result = await handler(event, context, cb);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual(expectedResponse);
    expect(result.headers).toBeDefined();
  });

  it("should handle empty products and stocks", async () => {
    (dynamodbClient.send as jest.Mock)
      .mockImplementationOnce(() => Promise.resolve({ Items: [] }))
      .mockImplementationOnce(() => Promise.resolve({ Items: [] }));

    const result = await handler(event, context, cb);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual([]);
  });

  it("should handle DynamoDB errors", async () => {
    (dynamodbClient.send as jest.Mock).mockImplementationOnce(() =>
      Promise.reject(new Error("DB Error"))
    );

    const result = await handler(event, context, cb);

    expect(result.statusCode).toBe(500);
  });
});

import { Context } from "aws-lambda";
import { handler } from "../getProductById";
import { dynamodbClient } from "../../utils/dbClient";

jest.mock("../../utils/dbClient", () => ({
  dynamodbClient: {
    send: jest.fn(),
  },
}));

describe("getProductById", () => {
  const context = {} as Context;
  const cb = () => {};

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return a product with stock count", async () => {
    (dynamodbClient.send as jest.Mock)
      .mockResolvedValueOnce({
        Item: { id: "1", title: "Product A", price: 50 },
      })
      .mockResolvedValueOnce({ Item: { product_id: "1", count: 10 } });

    const event = { pathParameters: { productId: "1" } };
    const response = await handler(event, context, cb);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      id: "1",
      title: "Product A",
      price: 50,
      count: 10,
    });
  });

  it("should return 404 if product not found", async () => {
    (dynamodbClient.send as jest.Mock)
      .mockResolvedValueOnce({ Item: null })
      .mockResolvedValueOnce({ Item: null });

    const event = { pathParameters: { productId: "1" } };
    const response = await handler(event, context, cb);

    expect(response.statusCode).toBe(404);
  });

  it("should return 400 if productId is missing", async () => {
    const event = { pathParameters: {} };
    const response = await handler(event, context, cb);

    expect(response.statusCode).toBe(400);
    expect(response.body).toContain("Product ID is required");
  });

  it("should handle DynamoDB errors", async () => {
    (dynamodbClient.send as jest.Mock).mockRejectedValue(
      new Error("DynamoDB error")
    );

    const event = { pathParameters: { productId: "1" } };
    const response = await handler(event, context, cb);

    expect(response.statusCode).toBe(500);
  });
});

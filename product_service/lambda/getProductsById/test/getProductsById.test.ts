import { Context } from "aws-lambda";
import { getProductsById } from "../index";
import { products as mockProducts } from "../../../layers/nodejs/mock";
import { commonHeaders as mockHeaders } from "../../../layers/nodejs/headers";

jest.mock("../../../layers/nodejs/headers", () => ({
  commonHeaders: {
    "Content-Type": "application/json",
  },
}));
jest.mock("../../../layers/nodejs/mock", () => ({
  products: [
    { id: "1", name: "Product 1" },
    { id: "2", name: "Product 2" },
  ],
}));

describe("getProductsById Lambda Function", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  const context = {} as Context;
  const cb = () => {};

  it("should return a product when a valid ID is provided", async () => {
    const event = {
      pathParameters: { productId: mockProducts[0].id },
    };

    const response = await getProductsById(event, context, cb);
    expect(response.statusCode).toBe(200);
    expect(response.headers).toEqual(mockHeaders);
    expect(JSON.parse(response.body)).toEqual(mockProducts[0]);
  });

  it("should return 404 when the product is not found", async () => {
    const event = {
      pathParameters: { productId: "-1" },
    };
    const response = await getProductsById(event, context, cb);
    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body).message).toBe("Product not found");
  });
});

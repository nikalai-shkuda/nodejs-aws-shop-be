import { Context } from "aws-lambda";
import { getProducts } from "../index";
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

describe("getProducts Lambda Function", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  const event = {};
  const context = {} as Context;
  const cb = () => {};

  it("should return a list of products with status 200", async () => {
    const response = await getProducts(event, context, cb);
    expect(response.statusCode).toBe(200);
    expect(response.headers).toEqual(mockHeaders);
    expect(JSON.parse(response.body)).toEqual(mockProducts);
  });
});

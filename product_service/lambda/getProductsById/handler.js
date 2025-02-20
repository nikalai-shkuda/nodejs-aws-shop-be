import { products } from "./products.js";

export const getProductsById = async (event) => {
  try {
    const { productId } = event.pathParameters || {};
    const product = products.find(({ id }) => id === productId);

    if (!product) {
      return {
        body: JSON.stringify({ message: "Product not found" }),
        statusCode: 404,
      };
    }

    return {
      body: JSON.stringify(product),
      headers: {
        "Access-Control-Allow-Methods": "GET,OPTIONS,GET",
        "Access-Control-Allow-Origin": "*",
      },
      statusCode: 200,
    };
  } catch (error) {
    return {
      body: JSON.stringify({ message: error.message }),
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      statusCode: error instanceof NotFoundError ? 404 : 500,
    };
  }
};

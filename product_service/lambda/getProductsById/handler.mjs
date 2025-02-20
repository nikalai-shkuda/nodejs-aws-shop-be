import commonHeaders from "/opt/nodejs/shared/headers/common.mjs";
import products from "/opt/nodejs/shared/mock/products.mjs";

export const getProductsById = async (event) => {
  try {
    const { productId } = event.pathParameters || {};
    const product = products.find(({ id }) => id === productId);

    if (!product) {
      return {
        body: JSON.stringify({ message: "Product not found" }),
        headers: commonHeaders,
        statusCode: 404,
      };
    }

    return {
      body: JSON.stringify(product),
      headers: commonHeaders,
      statusCode: 200,
    };
  } catch (error) {
    console.error("Error fetching product:", error);
    return {
      body: JSON.stringify({
        message: error?.message || "Internal Server Error",
      }),
      headers: commonHeaders,
      statusCode: 500,
    };
  }
};

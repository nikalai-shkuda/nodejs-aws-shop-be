import commonHeaders from "/opt/nodejs/shared/headers/common.mjs";
import products from "/opt/nodejs/shared/mock/products.mjs";

export const getProducts = async () => {
  try {
    return {
      body: JSON.stringify(products || []),
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

import { products } from "./products.js";
import { NotFoundError } from "./errors.js";

export const getProducts = async () => {
  try {
    return {
      body: JSON.stringify(products || []),
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS,GET",
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

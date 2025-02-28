import { APIGatewayProxyResult } from "aws-lambda";
import { commonHeaders } from "../layers/nodejs/headers";

type serverErrorType = {
  error?: unknown;
  message?: string;
  statusCode?: number;
};

export const handleError = (params: serverErrorType): APIGatewayProxyResult => {
  const {
    error = null,
    message = "Internal Server Error",
    statusCode = 500,
  } = params;
  console.error(message, error);
  return {
    body: JSON.stringify({
      message: error instanceof Error ? error.message : message,
    }),
    headers: commonHeaders,
    statusCode,
  };
};

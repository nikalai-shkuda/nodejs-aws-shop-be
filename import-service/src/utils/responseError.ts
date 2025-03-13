import { APIGatewayProxyResult } from "aws-lambda";
import { commonHeaders } from "./headers";

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
  console.log(error || message);
  return {
    body: JSON.stringify({
      message: error instanceof Error ? error.message : message,
    }),
    headers: commonHeaders,
    statusCode,
  };
};

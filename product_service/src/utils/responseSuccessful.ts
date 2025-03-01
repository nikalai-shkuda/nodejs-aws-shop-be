import { APIGatewayProxyResult } from "aws-lambda";
import { commonHeaders } from "./headers";

export const response = (
  statusCode: number,
  body: any
): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: commonHeaders,
    body: JSON.stringify(body),
  };
};

import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Handler,
} from "aws-lambda";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "../config";
import { handleError } from "../utils/responseError";
import { response } from "../utils/responseSuccessful";

const client = new S3Client({ region: config.region });
const BUCKET_NAME = process.env.BUCKET_NAME;

export const handler: Handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    console.log(
      "importProductsFile invoked with event:",
      JSON.stringify(event, null, 2)
    );
    const fileName = event.queryStringParameters?.name;
    if (!fileName) {
      return handleError({
        message: "Filename is required",
        statusCode: 400,
      });
    }

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      ContentType: "text/csv",
      Key: `${config.uploadFolder}/${fileName}`,
    });
    const signedUrl = await getSignedUrl(client, command, { expiresIn: 3600 });

    console.log(`Generated signed URL: ${signedUrl}`);
    return response(200, signedUrl);
  } catch (error) {
    return handleError({ error, message: "Error generating signed URL" });
  }
};

import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { S3Event } from "aws-lambda";
import csv from "csv-parser";
import { Readable } from "stream";
import { handleError } from "../utils/responseError";

const client = new S3Client({ region: "eu-west-1" });

export const handler = async (event: S3Event): Promise<any> => {
  console.log(
    "importFileParser with S3 Event:",
    JSON.stringify(event, null, 2)
  );

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = record.s3.object.key;
    console.log("importFileParser: ", { bucket, key });

    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const response = await client.send(command);
      const stream = response.Body;
      console.log("importFileParser: ", { stream });

      if (!stream) {
        return handleError({
          message: `Failed to get stream for ${key}`,
          statusCode: 400,
        });
      }
      parseCSV(stream as Readable);
    } catch (error) {
      return handleError({ error, message: "Error processing file" });
    }
  }
};

const parseCSV = (stream: Readable) => {
  return new Promise((resolve, reject) => {
    stream
      .pipe(csv())
      .on("data", (data) => console.log("Parsed CSV Record:", data))
      .on("end", () => resolve(true))
      .on("error", (error) => reject(error));
  });
};

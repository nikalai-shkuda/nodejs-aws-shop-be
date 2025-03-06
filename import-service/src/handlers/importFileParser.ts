import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { S3Event } from "aws-lambda";
import csv from "csv-parser";
import { Readable } from "stream";
import { handleError } from "../utils/responseError";

const client = new S3Client({ region: "eu-west-1" });

export const handler = async (event: S3Event): Promise<any> => {
  try {
    console.log(
      "importFileParser with S3 Event:",
      JSON.stringify(event, null, 2)
    );

    for (const record of event.Records) {
      const bucket = record.s3.bucket.name;
      const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

      console.log("importFileParser: ", { bucket, key });

      if (!key.startsWith("uploaded")) {
        console.log(
          `Skipping file ${key} because it's not in the upload folder`
        );
        return;
      }

      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const { Body: stream } = await client.send(command);
      console.log("importFileParser stream: ", stream);

      if (!stream) {
        return handleError({
          message: `Failed to get stream for ${key}`,
          statusCode: 400,
        });
      }
      await parseCSV(stream as Readable);
      console.log(`CSV parsing complete for ${key}`);

      const targetKey = key.replace("uploaded", "parsed");
      await moveFile(bucket, key, targetKey);
    }
  } catch (error) {
    return handleError({ error, message: "Error processing file" });
  }
};

const moveFile = async (
  bucket: string,
  sourceKey: string,
  targetKey: string
) => {
  try {
    console.log(
      `Moving file from ${sourceKey} to ${targetKey} in bucket ${bucket}`
    );
    await client.send(
      new CopyObjectCommand({
        Bucket: bucket,
        CopySource: encodeURIComponent(`${bucket}/${sourceKey}`),
        Key: targetKey,
      })
    );
    console.log(`File moved to: ${targetKey}`);

    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: sourceKey,
      })
    );
    console.log(`File deleted from: ${sourceKey}`);
  } catch (error) {
    console.error("Error moving file, error:", error);
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

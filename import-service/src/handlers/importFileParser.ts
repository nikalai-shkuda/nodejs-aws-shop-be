import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { S3Event } from "aws-lambda";
import csv from "csv-parser";
import { Readable } from "stream";
import { config } from "../config";
import { handleError } from "../utils/responseError";

const s3Client = new S3Client({ region: config.region });
const sqsClient = new SQSClient({ region: config.region });
const SQS_URL = process.env.SQS_URL || "";

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

      if (!key.startsWith(config.uploadFolder)) {
        console.log(
          `Skipping file ${key} because it's not in the upload folder`
        );
        return;
      }

      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const { Body } = await s3Client.send(command);

      if (!Body) {
        return handleError({
          message: `Failed to get stream for ${key}`,
          statusCode: 400,
        });
      }
      await parseCSV(Body as Readable);
      console.log(`CSV parsing complete for ${key}`);

      const targetKey = key.replace(config.uploadFolder, config.parsedFolder);
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
    await s3Client.send(
      new CopyObjectCommand({
        Bucket: bucket,
        CopySource: encodeURIComponent(`${bucket}/${sourceKey}`),
        Key: targetKey,
      })
    );

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: sourceKey,
      })
    );
    console.log(`File moved to: ${targetKey} and deleted from: ${sourceKey}`);
  } catch (error) {
    console.error("Error moving file, error:", error);
  }
};

const parseCSV = (stream: Readable) => {
  return new Promise((resolve, reject) => {
    stream
      .pipe(csv())
      .on("data", async (data) => {
        try {
          console.log("Sending to SQS:", data);
          await sqsClient.send(
            new SendMessageCommand({
              QueueUrl: SQS_URL,
              MessageBody: JSON.stringify(data),
            })
          );
        } catch (error) {
          console.error("Error sending message to SQS:", error);
        }
      })
      .on("end", () => resolve(true))
      .on("error", (error) => reject(error));
  });
};

import * as dotenv from "dotenv";

dotenv.config();

export const config = {
  accountId: process.env.ACCOUNT_ID || "XXXXXXXXXXXX",
  bucketName: "my-import-aws-service-bucket",
  parsedFolder: "parsed",
  uploadFolder: "uploaded",
  region: "eu-west-1",
  stage: "dev",
};

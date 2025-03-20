import * as dotenv from "dotenv";

dotenv.config();

export const config = {
  region: "eu-west-1",
  stage: "dev",
  userName: process.env.USER_NAME || "",
  userPassword: process.env.USER_PASSWORD || "",
};

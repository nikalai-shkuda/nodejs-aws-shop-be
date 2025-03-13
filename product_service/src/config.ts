import * as dotenv from "dotenv";

dotenv.config();

export const config = {
  productsTableName: "products",
  stocksTableName: "stocks",
  region: "eu-west-1",
  stage: "dev",
  subscriptionEmailPrimary: process.env.SUBSCRIPTION_EMAIL_PRIMARY || "",
};

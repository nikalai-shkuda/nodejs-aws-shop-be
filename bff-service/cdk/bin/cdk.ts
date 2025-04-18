#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { BffCloudfrontStack } from "../lib/cdk-stack";

const app = new cdk.App();
new BffCloudfrontStack(app, "BffCloudfrontStack", {
  env: {
    region: "eu-west-1",
  },
});

#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { config } from "../config";
import { ImportServiceStack } from "../lib/import-service-stack";

const app = new cdk.App();
new ImportServiceStack(app, "ImportServiceStack", {
  env: { region: config.region },
});

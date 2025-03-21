#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { AuthorizationServiceStack } from "../lib/authorization-service-stack";
import { config } from "../config";

const app = new cdk.App();
new AuthorizationServiceStack(app, "AuthorizationServiceStack", {
  env: { region: config.region },
});

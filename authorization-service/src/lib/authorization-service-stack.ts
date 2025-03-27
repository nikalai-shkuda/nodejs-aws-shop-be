import * as cdk from "aws-cdk-lib";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { config } from "../config";

import path = require("path");

export class AuthorizationServiceStack extends cdk.Stack {
  public basicAuthorizerLambda: NodejsFunction;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const commonLabmdaSettings = {
      runtime: Runtime.NODEJS_22_X,
      handler: "handler",
      environment: {
        REGION: config.region,
        USER_NAME: config.userName,
        USER_PASSWORD: config.userPassword,
      },
      bundling: {
        sourceMap: true,
      },
    };

    this.basicAuthorizerLambda = new NodejsFunction(
      this,
      "BasicAuthorizerLambda",
      {
        ...commonLabmdaSettings,
        entry: path.join(__dirname, "../handlers/basicAuthorizer.ts"),
      }
    );

    new cdk.CfnOutput(this, "BasicAuthorizerLambdaArn", {
      value: this.basicAuthorizerLambda.functionArn,
      exportName: "BasicAuthorizerLambdaArn",
    });
  }
}

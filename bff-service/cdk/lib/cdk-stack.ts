import * as cdk from "aws-cdk-lib";
import { Stack, StackProps } from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import { Construct } from "constructs";
import * as dotenv from "dotenv";

import path = require("path");

dotenv.config({ path: path.join(__dirname, "../../.env") });

export class BffCloudfrontStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const origin = new origins.HttpOrigin(
      process.env.CART_API_EB_URL as string,
      {
        protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
      }
    );

    const distribution = new cloudfront.Distribution(this, "BffCloudfront", {
      defaultBehavior: {
        origin,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    });

    new cdk.CfnOutput(this, "BffCloudFrontURL", {
      value: `https://${distribution.domainName}`,
    });
  }
}

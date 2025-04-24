import * as cdk from "aws-cdk-lib";
import { Stack, StackProps } from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import { Construct } from "constructs";
import * as dotenv from "dotenv";

import path = require("path");

dotenv.config({ path: path.join(__dirname, "../../.env") });

const DEFAULT_TTL = 120; // 2 minutes

export class BffCloudfrontStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const cachePolicy = new cloudfront.CachePolicy(this, "CachePolicy", {
      cachePolicyName: "BffCachePolicy",
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
        "Authorization",
        "Cache-Control"
      ),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      defaultTtl: cdk.Duration.seconds(DEFAULT_TTL),
      maxTtl: cdk.Duration.seconds(DEFAULT_TTL),
      minTtl: cdk.Duration.seconds(0),
    });

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
        cachePolicy,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    });

    new cdk.CfnOutput(this, "BffCloudFrontURL", {
      value: `https://${distribution.domainName}`,
    });
  }
}

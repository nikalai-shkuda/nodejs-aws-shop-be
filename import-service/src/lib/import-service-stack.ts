import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { AuthorizationType } from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3Notifications from "aws-cdk-lib/aws-s3-notifications";
import { Construct } from "constructs";
import { config } from "../config";

import path = require("path");

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const importBucket = new s3.Bucket(this, "ImportBucket", {
      bucketName: config.bucketName,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
        },
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const commonLabmdaSettings = {
      runtime: Runtime.NODEJS_22_X,
      handler: "handler",
      environment: {
        BUCKET_NAME: importBucket.bucketName,
        REGION: config.region,
      },
    };

    const importProductsFileLambda = new NodejsFunction(
      this,
      "ImportProductsFileLambda",
      {
        ...commonLabmdaSettings,
        entry: path.join(__dirname, "../handlers/importProductsFile.ts"),
      }
    );

    // Import the queue URL from Product Service stack
    const batchProductsQueueUrl = cdk.Fn.importValue("CatalogItemsQueueUrl");
    const batchProductsQueueArn = cdk.Fn.importValue("CatalogItemsQueueArn");

    const importFileParserLambda = new NodejsFunction(
      this,
      "ImportFileParserLambda",
      {
        ...commonLabmdaSettings,
        entry: path.join(__dirname, "../handlers/importFileParser.ts"),
        environment: {
          SQS_URL: batchProductsQueueUrl,
        },
      }
    );
    importFileParserLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["sqs:SendMessage"],
        resources: [batchProductsQueueArn],
      })
    );
    importFileParserLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["s3:DeleteObject", "s3:PutObject"],
        resources: [
          `${importBucket.bucketArn}/${config.uploadFolder}/*`,
          `${importBucket.bucketArn}/${config.parsedFolder}/*`,
        ],
      })
    );

    const api = new apigateway.RestApi(this, "ImportServiceAPI", {
      restApiName: "Import Service",
      deployOptions: {
        stageName: config.stage,
        // loggingLevel: apigateway.MethodLoggingLevel.INFO,
        // dataTraceEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
      },
    });

    // Reference Basic Authorizer Lambda ARN
    const authorizerLambdaArn = cdk.Fn.importValue("BasicAuthorizerLambdaArn");
    const authorizerLambda = lambda.Function.fromFunctionArn(
      this,
      "BasicAuthorizer",
      authorizerLambdaArn
    );
    // Add permissions after authorizer is created. These will be associated with the authorizer through the sourceArn
    new lambda.CfnPermission(this, "AuthorizerPermission", {
      action: "lambda:InvokeFunction",
      functionName: authorizerLambda.functionName,
      principal: "apigateway.amazonaws.com",
      sourceArn: `arn:aws:execute-api:${config.region}:${config.accountId}:${api.restApiId}/authorizers/*`,
    });
    const authorizer = new apigateway.TokenAuthorizer(
      this,
      "APIGatewayAuthorizer",
      {
        handler: authorizerLambda,
        identitySource: apigateway.IdentitySource.header("Authorization"),
        resultsCacheTtl: cdk.Duration.seconds(0),
      }
    );

    const importResource = api.root.addResource("import");
    importResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(importProductsFileLambda),
      {
        authorizer,
        authorizationType: AuthorizationType.CUSTOM,
      }
    );

    importBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3Notifications.LambdaDestination(importFileParserLambda),
      { prefix: `${config.uploadFolder}/` }
    );

    importBucket.grantReadWrite(importProductsFileLambda);
    importBucket.grantRead(importFileParserLambda);

    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
      description: "API Gateway endpoint URL for Import Service",
    });
    new cdk.CfnOutput(this, "SQSQueueUrl", {
      value: batchProductsQueueUrl,
      description: "SQS Queue URL for Product Catalog",
    });
  }
}

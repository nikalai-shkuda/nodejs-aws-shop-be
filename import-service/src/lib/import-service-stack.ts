import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3Notifications from "aws-cdk-lib/aws-s3-notifications";
import { Construct } from "constructs";
import path = require("path");
import { config } from "../config";

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
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ["OPTIONS", "GET", "PUT"],
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
      },
    });

    const importResource = api.root.addResource("import");
    importResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(importProductsFileLambda)
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

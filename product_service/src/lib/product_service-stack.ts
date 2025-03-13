import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { AttributeType, Table } from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as snsSubscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import { config } from "../config";
import path = require("path");

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const productsTable = new Table(this, "ProductsTable", {
      partitionKey: { name: "id", type: AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Change to RETAIN in production
      tableName: config.productsTableName,
    });

    const stocksTable = new Table(this, "StocksTable", {
      partitionKey: { name: "product_id", type: AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Change to RETAIN in production
      tableName: config.stocksTableName,
    });

    const commonLabmdaSettings = {
      runtime: Runtime.NODEJS_22_X,
      handler: "handler",
      environment: {
        PRODUCTS_TABLE: productsTable.tableName,
        STOCKS_TABLE: stocksTable.tableName,
        REGION: config.region,
      },
      bundling: {
        sourceMap: true,
      },
    };

    const getProductsLambda = new NodejsFunction(this, "GetProductsLambda", {
      ...commonLabmdaSettings,
      entry: path.join(__dirname, "../handlers/getProducts.ts"),
    });

    const getProductsByIdLambda = new NodejsFunction(
      this,
      "GetProductsByIdLambda",
      {
        ...commonLabmdaSettings,
        entry: path.join(__dirname, "../handlers/getProductById.ts"),
      }
    );

    const createProductLambda = new NodejsFunction(
      this,
      "CreateProductLambda",
      {
        ...commonLabmdaSettings,
        entry: path.join(__dirname, "../handlers/createProduct.ts"),
      }
    );

    productsTable.grantReadWriteData(getProductsLambda);
    productsTable.grantReadWriteData(getProductsByIdLambda);
    productsTable.grantReadWriteData(createProductLambda);
    stocksTable.grantReadWriteData(getProductsLambda);
    stocksTable.grantReadWriteData(getProductsByIdLambda);
    stocksTable.grantReadWriteData(createProductLambda);

    const api = new apigateway.RestApi(this, "ProductServiceAPI", {
      restApiName: "Product Service",
      deployOptions: {
        stageName: config.stage,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ["OPTIONS", "GET", "POST", "PUT"],
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
      },
    });

    const productsResource = api.root.addResource("products");
    productsResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getProductsLambda)
    );
    productsResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(createProductLambda)
    );

    const productByIdResource = productsResource.addResource("{productId}");
    productByIdResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getProductsByIdLambda)
    );

    // SQS Queue
    const catalogItemsQueue = new sqs.Queue(this, "BatchProductsQueue", {
      queueName: "catalogItemsQueue",
      visibilityTimeout: cdk.Duration.seconds(60),
      receiveMessageWaitTime: cdk.Duration.seconds(20),
    });

    // SNS Topic
    const productEmailTopic = new sns.Topic(this, "ProductEmailTopic", {
      topicName: "ProductTopicNotifications",
    });

    const snsPublishPolicy = new iam.PolicyStatement({
      actions: ["sns:Publish"],
      resources: [productEmailTopic.topicArn],
    });

    const catalogBatchProcessLambda = new NodejsFunction(
      this,
      "CatalogBatchProcessLambda",
      {
        ...commonLabmdaSettings,
        entry: path.join(__dirname, "../handlers/catalogBatchProcess.ts"),
      }
    );
    catalogBatchProcessLambda.addEnvironment(
      "SNS_TOPIC_ARN",
      productEmailTopic.topicArn
    );
    catalogBatchProcessLambda.addEventSource(
      new lambdaEventSources.SqsEventSource(catalogItemsQueue, {
        batchSize: 5,
      })
    );
    catalogBatchProcessLambda.addToRolePolicy(snsPublishPolicy);

    productEmailTopic.addSubscription(
      new snsSubscriptions.EmailSubscription(config.subscriptionEmailPrimary)
    );
    productEmailTopic.grantPublish(catalogBatchProcessLambda);

    new cdk.CfnOutput(this, "CatalogItemsQueueUrl", {
      value: catalogItemsQueue.queueUrl,
      exportName: "CatalogItemsQueueUrl",
    });
    new cdk.CfnOutput(this, "CatalogItemsQueueArn", {
      value: catalogItemsQueue.queueArn,
      exportName: "CatalogItemsQueueArn",
    });

    // Grant permissions
    catalogItemsQueue.grantConsumeMessages(catalogBatchProcessLambda);
    productsTable.grantWriteData(catalogBatchProcessLambda);
    stocksTable.grantReadWriteData(catalogBatchProcessLambda);
  }
}

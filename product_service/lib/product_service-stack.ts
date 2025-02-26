import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { AttributeType, Table } from "aws-cdk-lib/aws-dynamodb";
import { Code, LayerVersion, Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import path = require("path");

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const productsTable = new Table(this, "ProductsTable", {
      partitionKey: { name: "id", type: AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Change to RETAIN in production
      tableName: "products",
    });

    const stocksTable = new Table(this, "StocksTable", {
      partitionKey: { name: "product_id", type: AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Change to RETAIN in production
      tableName: "stocks",
    });

    const commonLayer = new LayerVersion(this, "CommonLayer", {
      code: Code.fromAsset("layers"),
      compatibleRuntimes: [Runtime.NODEJS_22_X],
      description: "Common layer with shared code",
    });

    const commonLabmdaSettings = {
      runtime: Runtime.NODEJS_22_X,
      environment: {
        PRODUCTS_TABLE: productsTable.tableName,
        STOCKS_TABLE: stocksTable.tableName,
        REGION: "eu-west-1",
      },
      bundling: {
        sourceMap: true,
        externalModules: ["headers", "mock", "types"],
      },
      layers: [commonLayer],
    };

    const getProductsLambda = new NodejsFunction(
      this,
      "BadLayerExampleLambda",
      {
        entry: path.join(__dirname, "../lambda/getProducts/index.ts"),
        handler: "getProducts",
        ...commonLabmdaSettings,
      }
    );

    const getProductsByIdLambda = new NodejsFunction(
      this,
      "GetProductsByIdLambda",
      {
        entry: path.join(__dirname, "../lambda/getProductsById/index.ts"),
        handler: "getProductsById",
        ...commonLabmdaSettings,
      }
    );

    const createProductLambda = new NodejsFunction(
      this,
      "CreateProductLambda",
      {
        entry: path.join(__dirname, "../lambda/createProduct/index.ts"),
        handler: "createProduct",
        ...commonLabmdaSettings,
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
        stageName: "dev",
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
  }
}

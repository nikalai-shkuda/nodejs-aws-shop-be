import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { AttributeType, Table } from "aws-cdk-lib/aws-dynamodb";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import path = require("path");
import { config } from "../config";

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
  }
}

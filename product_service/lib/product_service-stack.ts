import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { Code, LayerVersion, Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import path = require("path");

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const commonLayer = new LayerVersion(this, "CommonLayer", {
      code: Code.fromAsset("layers"),
      compatibleRuntimes: [Runtime.NODEJS_22_X],
      description: "Common layer with shared code",
    });

    const commonLabmdaSettings = {
      runtime: Runtime.NODEJS_22_X,
      environment: {
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

    const api = new apigateway.RestApi(this, "ProductServiceAPI", {
      restApiName: "Product Service",
      deployOptions: {
        stageName: "dev",
      },
    });

    const productsResource = api.root.addResource("products");
    productsResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getProductsLambda)
    );

    const productByIdResource = productsResource.addResource("{productId}");
    productByIdResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getProductsByIdLambda)
    );
  }
}

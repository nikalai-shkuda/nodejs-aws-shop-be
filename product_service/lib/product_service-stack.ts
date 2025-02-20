import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const commonLayer = new lambda.LayerVersion(this, "CommonLayer", {
      code: lambda.Code.fromAsset("layers/common"),
      compatibleRuntimes: [lambda.Runtime.NODEJS_22_X],
      description: "Common layer with shared code",
    });

    const getProductsLambda = new lambda.Function(
      this,
      "GetAllProductsLambda",
      {
        runtime: lambda.Runtime.NODEJS_22_X,
        handler: "index.getProducts",
        code: lambda.Code.fromAsset("lambda/getProducts"),
        layers: [commonLayer],
      }
    );

    const getProductsByIdLambda = new lambda.Function(
      this,
      "GetProductsByIdLambda",
      {
        runtime: lambda.Runtime.NODEJS_22_X,
        handler: "index.getProductsById",
        code: lambda.Code.fromAsset("lambda/getProductsById"),
        layers: [commonLayer],
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

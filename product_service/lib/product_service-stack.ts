import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const getProductsLambda = new lambda.Function(
      this,
      "GetAllProductsLambda",
      {
        runtime: lambda.Runtime.NODEJS_22_X,
        handler: "index.getProducts",
        code: lambda.Code.fromAsset("lambda/getProducts"),
      }
    );

    const api = new apigateway.RestApi(this, "ProductServiceAPI", {
      restApiName: "Product Service",
      deployOptions: {
        stageName: "dev",
      },
    });

    const productsResource = api.root.addResource("product");
    productsResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getProductsLambda)
    );
  }
}

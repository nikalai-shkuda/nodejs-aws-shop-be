import { Context } from "aws-lambda";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import * as presigner from "@aws-sdk/s3-request-presigner";
import { mockClient } from "aws-sdk-client-mock";
import { handler } from "../importProductsFile";

const s3Mock = mockClient(S3Client);
const mockSignedUrl = "https://mock-signed-url.com";
const context = {} as Context;
const cb = jest.fn();

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn(),
}));

describe("importProductsFile handler", () => {
  beforeEach(() => {
    s3Mock.reset();
    jest.clearAllMocks();

    // Mock getSignedUrl to return a test URL
    (presigner.getSignedUrl as jest.Mock).mockResolvedValue(mockSignedUrl);
  });

  it("should return signed URL when filename is provided", async () => {
    const event = {
      queryStringParameters: {
        name: "test-file.csv",
      },
    };

    const result = await handler(event, context, cb);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toBe(mockSignedUrl);

    // Verify the correct parameters were passed to getSignedUrl
    expect(presigner.getSignedUrl).toHaveBeenCalledWith(
      expect.any(S3Client),
      expect.any(PutObjectCommand),
      { expiresIn: 3600 }
    );
  });

  it("should return 400 when filename is not provided", async () => {
    const event = {
      queryStringParameters: {},
    };

    const result = await handler(event, context, cb);

    expect(result.statusCode).toBe(400);
    expect(presigner.getSignedUrl).not.toHaveBeenCalled();
  });

  it("should handle null queryStringParameters", async () => {
    const event = {
      queryStringParameters: null,
    };

    const result = await handler(event, context, cb);

    expect(result.statusCode).toBe(400);
    expect(presigner.getSignedUrl).not.toHaveBeenCalled();
  });

  it("should handle errors when generating signed URL fails", async () => {
    const event = {
      queryStringParameters: {
        name: "test-file.csv",
      },
    };

    const error = new Error("Failed to generate URL");
    (presigner.getSignedUrl as jest.Mock).mockRejectedValue(error);

    const result = await handler(event, context, cb);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      message: "Failed to generate URL",
    });
  });
});

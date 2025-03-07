import { S3Event } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import {
  S3Client,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { sdkStreamMixin } from "@aws-sdk/util-stream-node";
import { Readable } from "stream";
import { config } from "../../config";
import { handler } from "../importFileParser";
import { handleError } from "../../utils/responseError";

const s3Mock = mockClient(S3Client);
const mockBucketName = "test-bucket";
const mockCSV = "test.csv";

const mockEvent: S3Event = {
  Records: [
    {
      eventVersion: "2.0",
      eventSource: "aws:s3",
      awsRegion: config.region,
      eventTime: "1970-01-01T00:00:00.000Z",
      eventName: "ObjectCreated:Put",
      userIdentity: {
        principalId: "EXAMPLE",
      },
      requestParameters: {
        sourceIPAddress: "127.0.0.1",
      },
      responseElements: {
        "x-amz-request-id": "EXAMPLE123456789",
        "x-amz-id-2":
          "EXAMPLE123/5678abcdefghijklambdaisawesome/mnopqrstuvwxyzABCDEFGH",
      },
      s3: {
        s3SchemaVersion: "1.0",
        configurationId: "testConfigRule",
        bucket: {
          name: mockBucketName,
          ownerIdentity: {
            principalId: "EXAMPLE",
          },
          arn: `arn:aws:s3:::${mockBucketName}`,
        },
        object: {
          key: `${config.uploadFolder}/${mockCSV}`,
          size: 1024,
          eTag: "0123456789abcdef0123456789abcdef",
          sequencer: "0A1B2C3D4E5F678901",
        },
      },
    },
  ],
};

describe("importFileParser handler", () => {
  beforeEach(() => {
    s3Mock.reset();
    jest.clearAllMocks();
  });

  it("should successfully process a CSV file", async () => {
    const mockStream = sdkStreamMixin(
      new Readable({
        read() {
          this.push("id,name\n1,test");
          this.push(null);
        },
      })
    );

    s3Mock.on(GetObjectCommand).resolves({ Body: mockStream });
    s3Mock.on(CopyObjectCommand).resolves({});
    s3Mock.on(DeleteObjectCommand).resolves({});

    await handler(mockEvent);

    const getObjectCall = s3Mock.commandCalls(GetObjectCommand)[0];
    expect(getObjectCall.args[0].input).toEqual({
      Bucket: mockBucketName,
      Key: `${config.uploadFolder}/${mockCSV}`,
    });

    const copyObjectCall = s3Mock.commandCalls(CopyObjectCommand)[0];
    expect(copyObjectCall.args[0].input).toEqual({
      Bucket: mockBucketName,
      CopySource: encodeURIComponent(
        `${mockBucketName}/${config.uploadFolder}/${mockCSV}`
      ),
      Key: `${config.parsedFolder}/${mockCSV}`,
    });

    const deleteObjectCall = s3Mock.commandCalls(DeleteObjectCommand)[0];
    expect(deleteObjectCall.args[0].input).toEqual({
      Bucket: mockBucketName,
      Key: `${config.uploadFolder}/${mockCSV}`,
    });
  });

  it("should skip processing if file is not in upload folder", async () => {
    const invalidEvent: S3Event = {
      Records: [
        {
          ...mockEvent.Records[0],
          s3: {
            ...mockEvent.Records[0].s3,
            object: {
              ...mockEvent.Records[0].s3.object,
              key: `invalid-folder/${mockCSV}`,
            },
          },
        },
      ],
    };

    await handler(invalidEvent);
    expect(s3Mock.calls()).toHaveLength(0);
  });

  it("should handle error when stream is not available", async () => {
    s3Mock.on(GetObjectCommand).resolves({ Body: undefined });

    const result = await handler(mockEvent);

    expect(result).toEqual(
      handleError({
        message: `Failed to get stream for ${config.uploadFolder}/${mockCSV}`,
        statusCode: 400,
      })
    );
  });

  it("should handle S3 operation errors", async () => {
    s3Mock.on(GetObjectCommand).rejects(new Error("S3 Error"));

    const result = await handler(mockEvent);

    expect(result).toEqual(
      handleError({
        message: "S3 Error",
        statusCode: 500,
      })
    );
  });
});

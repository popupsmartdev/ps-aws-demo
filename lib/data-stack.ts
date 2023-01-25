import {
  Duration,
  Stack,
  StackProps,
  CfnOutput,
} from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { CfnDeliveryStream } from 'aws-cdk-lib/aws-kinesisfirehose';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import {
  SqsEventSource,
  S3EventSource,
} from 'aws-cdk-lib/aws-lambda-event-sources';

import { HttpApi, HttpMethod } from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';

import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

const runtime = Runtime.NODEJS_18_X;

export class DataStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const leadHandler = new lambda.NodejsFunction(this, 'lead-handler', {
      runtime,
      timeout: Duration.seconds(10),
      memorySize: 256,
      entry: 'src/handlers/lead.ts',
    });

    const leadQueue = new sqs.Queue(this, 'lead-queue', {
      queueName: 'lead-queue.fifo',
      contentBasedDeduplication: true,
    });

    leadHandler.addEventSource(
      new SqsEventSource(leadQueue, {
        batchSize: 1,
      }),
    );

    const analyticsBucket = new s3.Bucket(this, 'analytics-bucket');

    const aggregatorHandler = new lambda.NodejsFunction(this, 'aggregator-handler', {
      runtime,
      timeout: Duration.minutes(10),
      memorySize: 256,
      entry: 'src/handlers/aggregator.ts',
    });
    analyticsBucket.grantRead(aggregatorHandler);

    aggregatorHandler.addEventSource(
      new S3EventSource(analyticsBucket, {
        events: [s3.EventType.OBJECT_CREATED],
      }),
    );

    const analyticsRole = new iam.Role(this, 'analytics-role', {
      assumedBy: new iam.ServicePrincipal('firehose.amazonaws.com'),
    });

    // Setup the IAM policy for Kinesis Firehose
    const firehosePolicy = new iam.Policy(this, 'KinesisFirehosePolicy', {
      statements: [
        new iam.PolicyStatement({
          actions: [
            's3:AbortMultipartUpload',
            's3:GetBucketLocation',
            's3:GetObject',
            's3:ListBucket',
            's3:ListBucketMultipartUploads',
            's3:PutObject',
          ],
          resources: [
            `${analyticsBucket.bucketArn}`,
            `${analyticsBucket.bucketArn}/*`,
          ],
        }),
      ],
    });

    // Attach policy to role
    firehosePolicy.attachToRole(analyticsRole);

    const analyticsStream = new CfnDeliveryStream(this, 'analytics-stream', {
      deliveryStreamName: 'analytics-stream',
      extendedS3DestinationConfiguration: {
        roleArn: analyticsRole.roleArn,
        bucketArn: analyticsBucket.bucketArn,
        compressionFormat: 'GZIP',
        dynamicPartitioningConfiguration: {
          enabled: true,
        },
        processingConfiguration: {
          enabled: true,
          processors: [
            {
              type: 'MetadataExtraction',
              parameters: [
                {
                  parameterName: 'MetadataExtractionQuery',
                  parameterValue: '{accountId: .accountId}',
                },
                {
                  parameterName: 'JsonParsingEngine',
                  parameterValue: 'JQ-1.6',
                },
              ],
            },
            {
              type: 'AppendDelimiterToRecord',
              parameters: [
                {
                  parameterName: 'Delimiter',
                  parameterValue: '\\n',
                },
              ],
            },
          ],
        },
        prefix:
          'records/accountid=!{partitionKeyFromQuery:accountId}/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/',
        errorOutputPrefix: 'error/!{firehose:error-output-type}/',
      },
    });

    const apiHandlerRole = new iam.Role(this, 'api-handler-role', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    const apiPolicy = new iam.Policy(this, 'api-handler-policy', {
      statements: [
        new iam.PolicyStatement({
          actions: [
            'sqs:SendMessage',
            'sqs:GetQueueUrl',
            'sqs:GetQueueAttributes',
          ],
          resources: [`${leadQueue.queueArn}`],
        }),
        new iam.PolicyStatement({
          actions: ['firehose:PutRecord'],
          resources: [`${analyticsStream.attrArn}`],
        }),
      ],
    });

    apiPolicy.attachToRole(apiHandlerRole);

    const apiHandler = new lambda.NodejsFunction(this, 'api-handler', {
      runtime,
      timeout: Duration.seconds(10),
      memorySize: 256,
      environment: {
        LEAD_QUEUE_URL: leadQueue.queueUrl,
        DELIVERY_STREAM_NAME: analyticsStream.deliveryStreamName!,
      },
      entry: 'src/handlers/api.ts',
      role: apiHandlerRole,
    });

    const api = new HttpApi(this, 'handler-api', {});
    api.addRoutes({
      path: '/',
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration('handler-integration', apiHandler),
    });

    new CfnOutput(this, 'handler-api-url', {
      value: api.url!,
    });
  }
}

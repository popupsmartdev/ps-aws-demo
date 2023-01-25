import {CfnOutput, Duration, Stack, StackProps} from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
import {Runtime} from "aws-cdk-lib/aws-lambda";
import {SqsEventSource} from "aws-cdk-lib/aws-lambda-event-sources";

export class DemoStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const queue = new sqs.Queue(this, 'PsAwsDemoQueue', {
      visibilityTimeout: Duration.seconds(300)
    });

    const topic = new sns.Topic(this, 'PsAwsDemoTopic');

    topic.addSubscription(new subs.SqsSubscription(queue));

    const consumer = new lambda.NodejsFunction(
      this,
      'PsAwsDemoConsumer',
      {
        runtime: Runtime.NODEJS_18_X,
        timeout: Duration.seconds(10),
        memorySize: 256,
        entry: 'src/handlers/consumer.ts',
      },
    );

    consumer.addEventSource(
      new SqsEventSource(queue, {
        batchSize: 1,
      }),
    );

    const api = new apigw.LambdaRestApi(this, 'PsAwsDemoApi', {
      handler: consumer,
    });

    new CfnOutput(this, 'PsAwsDemoApiUrl', {
      value: api.url,
    });
  }
}

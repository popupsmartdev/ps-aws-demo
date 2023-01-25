import { ProxyHandler } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { FirehoseClient, PutRecordCommand } from '@aws-sdk/client-firehose';

const sqs = new SQSClient({});
const firehoseClient = new FirehoseClient({});

const leadQueueUrl = process.env.LEAD_QUEUE_URL;
const deliveryStreamName = process.env.DELIVERY_STREAM_NAME;

export const handler: ProxyHandler = async ({ body }) => {
  if (!body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Missing body' }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }

  const eventData = {
    ...JSON.parse(body),
    createdAt: new Date(),
  };
  const { type, sessionId } = eventData;

  try {
    if (type === 'lead') {
      const result = await sqs.send(
        new SendMessageCommand({
          QueueUrl: leadQueueUrl,
          MessageBody: body,
          MessageGroupId: sessionId,
        }),
      );
      // eslint-disable-next-line no-console
      console.log(result);
    }

    //TODO input validation

    const {
      formData,
      interactionType,
      interactionValue,
      campaignIds,
      ...rest
    } = eventData;

    await firehoseClient.send(
      new PutRecordCommand({
        DeliveryStreamName: deliveryStreamName,
        Record: {
          Data: Buffer.from(JSON.stringify(rest)),
        },
      }),
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Event saved' }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Internal server error',
        error: e,
        leadQueueUrl,
        deliveryStreamName,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }
};

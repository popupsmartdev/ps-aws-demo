import { S3Handler } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const client = new S3Client({});

export const handler: S3Handler = async (event) => {
  const records = event.Records;
  for (const record of records) {
    // read the file from s3
    const output = await client.send(
      new GetObjectCommand({
        Bucket: record.s3.bucket.name,
        Key: record.s3.object.key,
      }),
    );
    const data = await output.Body?.transformToString('utf-8');
    if (!data) {
      // eslint-disable-next-line no-console
      console.warn(
        'No data found',
        record.s3.bucket.name,
        record.s3.object.key,
      );
      continue;
    }
    console.log(data);
  }
};

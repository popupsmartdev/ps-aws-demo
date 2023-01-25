import { SQSHandler } from 'aws-lambda';

export const handler: SQSHandler = async (event) => {
  const records = event.Records;
  for (const record of records) {
    const { body } = record;
    console.log('Record body', body);
  }
};

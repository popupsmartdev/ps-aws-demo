import {
  PageViewEvent,
  Event,
  BaseEvent,
  DisplayEvent,
  InteractionEvent,
  LeadEvent,
} from '../events';
import { faker } from '@faker-js/faker';

const pages = [
  '/',
  '/about',
  '/contact',
  '/pricing',
  '/blog',
  'blog?page=1',
  'blog?tag=javascript',
  '/blog/1',
  '/blog/2',
  '/blog/2?utm_source=google&utm_medium=cpc&utm_campaign=blog&utm_term=blog&utm_content=blog',
];

const generateEvents = (accountId: number, campaigns: number[]): Event[] => {
  const sessionId = faker.datatype.uuid();

  const events: Event[] = [];

  const baseEvent: Omit<BaseEvent<'pageView'>, 'type'> = {
    sessionId,
    accountId,
    location: {
      city: faker.address.city(),
      country: faker.address.country(),
      latitude: faker.address.latitude(),
      longitude: faker.address.longitude(),
      region: faker.address.state(),
      timezone: faker.address.timeZone(),
      ip: faker.internet.ip(),
    },
    url: faker.internet.url(),
    page: faker.helpers.arrayElement(pages),
    userAgent: faker.internet.userAgent(),
    device: faker.helpers.arrayElement(['desktop', 'mobile', 'tablet']),
    resolution: faker.helpers.arrayElement(['sm', 'md', 'lg', 'xl']),
    os: faker.helpers.arrayElement([
      'windows',
      'macos',
      'linux',
      'ios',
      'android',
    ]),
    browser: faker.helpers.arrayElement(['chrome', 'firefox', 'safari']),
    language: faker.address.countryCode(),
  };

  for (let i = 0; i < faker.datatype.number({ min: 10, max: 100 }); i++) {
    const event: PageViewEvent = {
      ...baseEvent,
      type: 'pageView',
      campaigns,
    };
    events.push(event);
  }

  for (let i = 0; i < faker.datatype.number({ min: 1, max: 50 }); i++) {
    const event: DisplayEvent = {
      ...baseEvent,
      type: 'display',
      campaignId: faker.helpers.arrayElement(campaigns),
    };
    events.push(event);
  }

  for (let i = 0; i < faker.datatype.number({ min: 1, max: 10 }); i++) {
    const event: InteractionEvent = {
      ...baseEvent,
      type: 'interaction',
      interactionType: faker.helpers.arrayElement(['url', 'page', 'close']),
      interactionValue: faker.internet.url(),
      campaignId: faker.helpers.arrayElement(campaigns),
    };
    events.push(event);
  }

  for (let i = 0; i < faker.datatype.number({ min: 1, max: 10 }); i++) {
    const event: LeadEvent = {
      ...baseEvent,
      type: 'lead',
      campaignId: faker.helpers.arrayElement(campaigns),
      formData: {
        name: faker.name.firstName(),
        lastName: faker.name.lastName(),
        email: faker.internet.email(),
      },
    };
    events.push(event);
  }

  return events;
};

const generateData = async () => {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    throw new Error('API_URL is not defined');
  }

  while (true) {
    const accountId = faker.datatype.number({ min: 1, max: 20 });

    const events = generateEvents(accountId, [1, 2]);

    for (const event of events) {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });
      const data = await response.json();
      console.log({ ...data, event: event.type });
    }

    console.log('events sent', { accountId, events: events.length });
  }
};
generateData();

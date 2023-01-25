type EventType = 'pageView' | 'display' | 'interaction' | 'lead';

interface Location {
  ip: string;
  country: string;
  region: string;
  city: string;
  latitude: string;
  longitude: string;
  timezone: string;
}

export interface BaseEvent<TType extends EventType> {
  sessionId: string; // we will store a uuid in the local storage
  type: TType;
  accountId: number;
  location: Location;
  url: string;
  page: string;
  userAgent: string;
  device: string;
  resolution: string;
  os: string;
  browser: string;
  language: string;
  referer?: string;
}

// unique id for campaign events would be sessionId_campaignId
interface CampaignBaseEvent<TType extends Exclude<EventType, 'pageView'>>
  extends BaseEvent<TType> {
  campaignId: number;
}

export interface PageViewEvent extends BaseEvent<'pageView'> {
  campaigns: number[];
}

export interface DisplayEvent extends CampaignBaseEvent<'display'> {}

type InteractionType = 'url' | 'page' | 'close' | 'play-gamify';

export interface InteractionEvent extends CampaignBaseEvent<'interaction'> {
  interactionType: InteractionType;
  interactionValue: string; // find a better name
}

export interface LeadEvent extends CampaignBaseEvent<'lead'> {
  formData: Record<string, string | number | boolean | string[]>;
}

export type Event = PageViewEvent | DisplayEvent | InteractionEvent | LeadEvent;
export type CampaignEvent = DisplayEvent | InteractionEvent | LeadEvent;

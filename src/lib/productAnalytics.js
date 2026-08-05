import { track } from '@vercel/analytics';

export const HOME_EVENT_NAMES = Object.freeze({
  CTA: 'home_cta_selected',
  FEED_RETRY: 'home_feed_retry',
  RADAR_SIGNAL: 'home_radar_signal_opened',
  RECOMMENDATION: 'home_recommendation_opened',
});

const allowedNames = new Set(Object.values(HOME_EVENT_NAMES));
const allowedKeys = new Set(['action', 'state', 'surface']);
const safeValue = value => typeof value === 'string' && /^[a-z0-9_-]{1,40}$/i.test(value);

export function trackProductEvent(name, properties = {}) {
  if (!allowedNames.has(name)) return;

  const safeProperties = {};
  for (const [key, value] of Object.entries(properties)) {
    if (allowedKeys.has(key) && safeValue(value)) safeProperties[key] = value;
  }

  track(name, safeProperties);
}

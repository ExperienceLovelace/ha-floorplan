/*
 * Exposes getStateHistory(entityIds) inside the template sandbox of a
 * chart_set action, so a template can fetch raw entity history and build
 * arbitrary chart series.
 *
 * Fetches are throttled per action config to one call per refresh_interval
 * seconds, ten by default, and the window is fixed at the last 24 hours.
 * The result is the raw history/history_during_period response keyed by
 * entity id, with minimal response fields: s holds the state, lu holds the
 * last updated time in epoch seconds, lc holds the last changed time and
 * is only present when it differs from lu, and a holds the attributes on
 * the first entry.
 */

import pThrottle from 'p-throttle';
import {
  fetchRecentWS,
  HistoryStates,
} from '../../../../lib/homeassistant/data/history';
import { HomeAssistant } from '../../../../lib/homeassistant/types';
import { FloorplanCallServiceActionConfig } from '../floorplan-config';

export type StateHistoryFetcher = (
  hass: HomeAssistant,
  entityIds: string
) => Promise<HistoryStates>;

const throttledFetchers = new Map<
  FloorplanCallServiceActionConfig,
  StateHistoryFetcher
>();

// Raw fetch of the last `hoursToShow` hours (WS history_during_period)
export const fetchStateHistory = (
  hass: HomeAssistant,
  entityIds: string,
  hoursToShow = 24
): Promise<HistoryStates> => {
  const startTime = new Date();
  startTime.setHours(startTime.getHours() - hoursToShow);
  const endTime = new Date();
  return fetchRecentWS(hass, entityIds, startTime, endTime);
};

// Per-action throttled fetcher factory
export const getThrottledStateHistoryFetcher = (
  actionConfig: FloorplanCallServiceActionConfig,
  refreshIntervalSeconds = 10
): StateHistoryFetcher => {
  let fetcher = throttledFetchers.get(actionConfig);
  if (!fetcher) {
    fetcher = pThrottle({
      limit: 1,
      interval: refreshIntervalSeconds * 1000,
    })(fetchStateHistory) as StateHistoryFetcher;
    throttledFetchers.set(actionConfig, fetcher);
  }
  return fetcher;
};

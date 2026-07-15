/*
 * Ported from ha-floorplan v1.0.36beta181.
 *
 * Exposes `getStateHistory(entityIds)` inside the floorplan template
 * evaluation sandbox, so a chart_set template can fetch raw history and
 * build arbitrary ApexCharts series for type: 'apex-chart'.
 *
 * Throttling is per ACTION CONFIG: 1 call per `refresh_interval` seconds
 * (default 10). The window fetched is fixed at the last 24 hours. The
 * result is the raw `history/history_during_period` response keyed by
 * entity_id, with minimal-response fields (`s` state, `lu`/`lc`
 * epoch-seconds timestamps — `lc` only when it differs from `lu` — and
 * `a` attributes on the first entry).
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

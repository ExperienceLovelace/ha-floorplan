// Port of home-assistant/frontend src/data/history.ts, trimmed to the
// history fetching and processing used by the floorplan chart feature.
//
// The history/history_during_period WebSocket command returns compressed
// states: s holds the state, a holds the attributes, lu holds the last
// updated time in epoch seconds and lc holds the last changed time, which
// is only present when it differs from lu.

import { HassEntities, HassEntity } from 'home-assistant-js-websocket';
import { HomeAssistant } from '../types';

const DOMAINS_USE_LAST_UPDATED = ['climate', 'humidifier', 'water_heater'];
const NEED_ATTRIBUTE_DOMAINS = [
  'climate',
  'humidifier',
  'input_datetime',
  'thermostat',
  'water_heater',
];
const LINE_ATTRIBUTES_TO_KEEP = [
  'temperature',
  'current_temperature',
  'target_temp_low',
  'target_temp_high',
  'hvac_action',
  'humidity',
  'mode',
];

export interface LineChartState {
  state: string;
  last_changed: number;
  attributes?: Record<string, unknown>;
}

export interface LineChartEntity {
  domain: string;
  name: string;
  entity_id: string;
  states: LineChartState[];
}

export interface LineChartUnit {
  unit: string;
  identifier: string;
  data: LineChartEntity[];
}

export interface TimelineState {
  state: string;
  last_changed: number;
}

export interface TimelineEntity {
  name: string;
  entity_id: string;
  data: TimelineState[];
}

export interface HistoryResult {
  line: LineChartUnit[];
  timeline: TimelineEntity[];
}

export interface HistoryStates {
  [entityId: string]: EntityHistoryState[];
}

export interface EntityHistoryState {
  /** state */
  s: string;
  /** attributes */
  a: { [key: string]: unknown };
  /** last_changed; if set, also applies to lu */
  lc: number;
  /** last_updated */
  lu: number;
}

const computeDomain = (entityId: string): string =>
  entityId.substr(0, entityId.indexOf('.'));

export const computeStateNameFromEntityAttributes = (
  entityId: string,
  attributes: Record<string, unknown>
): string =>
  attributes.friendly_name === undefined
    ? entityId.substr(entityId.indexOf('.') + 1).replace(/_/g, ' ')
    : (attributes.friendly_name as string) || '';

export const entityIdHistoryNeedsAttributes = (
  hass: HomeAssistant,
  entityId: string
): boolean =>
  !hass.states[entityId] ||
  NEED_ATTRIBUTE_DOMAINS.includes(computeDomain(entityId));

export const fetchRecentWS = (
  hass: HomeAssistant,
  entityId: string, // This may be CSV
  startTime: Date,
  endTime: Date,
  skipInitialState = false,
  significantChangesOnly?: boolean,
  minimalResponse = true,
  noAttributes?: boolean
): Promise<HistoryStates> =>
  hass.callWS<HistoryStates>({
    type: 'history/history_during_period',
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    significant_changes_only: significantChangesOnly || false,
    include_start_time_state: !skipInitialState,
    minimal_response: minimalResponse,
    no_attributes: noAttributes || false,
    entity_ids: entityId.split(','),
  });

const equalState = (obj1: LineChartState, obj2: LineChartState) =>
  obj1.state === obj2.state &&
  // Only compare attributes if both states have an attributes object.
  // When `minimal_response` is sent, only the first and last state
  // will have attributes except for domains in DOMAINS_USE_LAST_UPDATED.
  (!obj1.attributes ||
    !obj2.attributes ||
    LINE_ATTRIBUTES_TO_KEEP.every(
      (attr) => obj1.attributes![attr] === obj2.attributes![attr]
    ));

const processTimelineEntity = (
  entityId: string,
  states: EntityHistoryState[],
  current_state: HassEntity | undefined
): TimelineEntity => {
  const data: TimelineState[] = [];
  const first: EntityHistoryState = states[0];
  for (const state of states) {
    if (data.length > 0 && state.s === data[data.length - 1].state) {
      continue;
    }
    data.push({
      state: state.s,
      // lc (last_changed) may be omitted if its the same
      // as lu (last_updated).
      last_changed: (state.lc ? state.lc : state.lu) * 1000,
    });
  }

  return {
    name: computeStateNameFromEntityAttributes(
      entityId,
      current_state?.attributes || first.a
    ),
    entity_id: entityId,
    data,
  };
};

const processLineChartEntities = (
  unit: string,
  entities: HistoryStates,
  hassEntities: HassEntities
): LineChartUnit => {
  const data: LineChartEntity[] = [];

  Object.keys(entities).forEach((entityId) => {
    const states = entities[entityId];
    const first: EntityHistoryState = states[0];
    const domain = computeDomain(entityId);
    const processedStates: LineChartState[] = [];

    for (const state of states) {
      let processedState: LineChartState;

      if (DOMAINS_USE_LAST_UPDATED.includes(domain)) {
        processedState = {
          state: state.s,
          last_changed: state.lu * 1000,
          attributes: {},
        };

        for (const attr of LINE_ATTRIBUTES_TO_KEEP) {
          if (attr in state.a) {
            processedState.attributes![attr] = state.a[attr];
          }
        }
      } else {
        processedState = {
          state: state.s,
          // lc (last_changed) may be omitted if its the same
          // as lu (last_updated).
          last_changed: (state.lc ? state.lc : state.lu) * 1000,
          attributes: {},
        };
      }

      if (
        processedStates.length > 1 &&
        equalState(
          processedState,
          processedStates[processedStates.length - 1]
        ) &&
        equalState(processedState, processedStates[processedStates.length - 2])
      ) {
        continue;
      }

      processedStates.push(processedState);
    }

    const attributes =
      entityId in hassEntities
        ? hassEntities[entityId].attributes
        : 'friendly_name' in first.a
        ? first.a
        : undefined;

    data.push({
      domain,
      name: computeStateNameFromEntityAttributes(entityId, attributes || {}),
      entity_id: entityId,
      states: processedStates,
    });
  });

  return {
    unit,
    identifier: Object.keys(entities).join(''),
    data,
  };
};

const stateUsesUnits = (state: HassEntity) =>
  attributesHaveUnits(state.attributes);

const attributesHaveUnits = (attributes: { [key: string]: unknown }) =>
  'unit_of_measurement' in attributes || 'state_class' in attributes;

export const computeHistory = (
  hass: HomeAssistant,
  stateHistory: HistoryStates
): HistoryResult => {
  const lineChartDevices: { [unit: string]: HistoryStates } = {};
  const timelineDevices: TimelineEntity[] = [];
  if (!stateHistory) {
    return { line: [], timeline: [] };
  }
  Object.keys(stateHistory).forEach((entityId) => {
    const stateInfo = stateHistory[entityId];
    if (stateInfo.length === 0) {
      return;
    }

    const currentState =
      entityId in hass.states ? hass.states[entityId] : undefined;
    const stateWithUnitorStateClass =
      !currentState &&
      stateInfo.find((state) => state.a && attributesHaveUnits(state.a));

    let unit: string | undefined;

    if (currentState && stateUsesUnits(currentState)) {
      unit = (currentState.attributes.unit_of_measurement as string) || ' ';
    } else if (stateWithUnitorStateClass) {
      unit = (stateWithUnitorStateClass.a.unit_of_measurement as string) || ' ';
    } else {
      unit = {
        climate: hass.config?.unit_system?.temperature,
        counter: '#',
        humidifier: '%',
        input_number: '#',
        number: '#',
        water_heater: hass.config?.unit_system?.temperature,
      }[computeDomain(entityId)];
    }

    if (!unit) {
      timelineDevices.push(
        processTimelineEntity(entityId, stateInfo, currentState)
      );
    } else if (unit in lineChartDevices && entityId in lineChartDevices[unit]) {
      lineChartDevices[unit][entityId].push(...stateInfo);
    } else {
      if (!(unit in lineChartDevices)) {
        lineChartDevices[unit] = {};
      }
      lineChartDevices[unit][entityId] = stateInfo;
    }
  });

  const unitStates = Object.keys(lineChartDevices).map((unit) =>
    processLineChartEntities(unit, lineChartDevices[unit], hass.states)
  );

  return { line: unitStates, timeline: timelineDevices };
};

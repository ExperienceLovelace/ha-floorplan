/* eslint-disable @typescript-eslint/no-explicit-any */
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import {
  computeHistory,
  HistoryStates,
} from '../../../src/lib/homeassistant/data/history';
import {
  formatNumber,
  numberFormatToLocale,
} from '../../../src/lib/homeassistant/common/number/format_number';
import {
  NumberFormat,
  TimeFormat,
} from '../../../src/lib/homeassistant/data/translation';
import { applyThemesOnElement } from '../../../src/lib/homeassistant/common/dom/apply_themes_on_element';
import { Themes } from '../../../src/lib/homeassistant/data/ws-themes';
import {
  HuiGaugeCard,
  getAngle,
} from '../../../src/components/floorplan/lib/charts/hui-gauge-card';
import { getThrottledStateHistoryFetcher } from '../../../src/components/floorplan/lib/charts/get-state-history';
import { EvalHelper } from '../../../src/components/floorplan/lib/eval-helper';
import { HomeAssistant } from '../../../src/lib/homeassistant/types';
import {
  FloorplanConfig,
  FloorplanCallServiceActionConfig,
} from '../../../src/components/floorplan/lib/floorplan-config';

type CallWSMock = jest.Mock<(msg: Record<string, any>) => Promise<any>>;

const makeCallWS = (result: any): CallWSMock =>
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  jest.fn(async (_msg: Record<string, any>) => result);

const makeHass = (
  states: Record<string, any>,
  callWS?: CallWSMock
): HomeAssistant =>
  ({
    states,
    language: 'en',
    callWS: callWS ?? makeCallWS({}),
    callService: jest.fn(),
    dockedSidebar: 'auto',
  } as unknown as HomeAssistant);

describe('Charts - history data layer', () => {
  it('computeHistory decodes minimal-response entries (lu only, lc fallback)', () => {
    const hass = makeHass({
      'sensor.temp': {
        entity_id: 'sensor.temp',
        state: '21.4',
        attributes: { unit_of_measurement: '°C', friendly_name: 'Temp' },
      },
    });

    const stateHistory: HistoryStates = {
      'sensor.temp': [
        { s: '20', lu: 1000, a: { unit_of_measurement: '°C' } } as any,
        { s: '21', lu: 1060 } as any, // lc omitted -> lu used
        { s: '22', lc: 1100, lu: 1120 } as any, // lc differs -> lc used
      ],
    };

    const result = computeHistory(hass, stateHistory);

    expect(result.timeline).toHaveLength(0);
    expect(result.line).toHaveLength(1);
    expect(result.line[0].unit).toBe('°C');
    const states = result.line[0].data[0].states;
    expect(states.map((s) => s.last_changed)).toEqual([
      1000 * 1000,
      1060 * 1000,
      1100 * 1000,
    ]);
    expect(result.line[0].data[0].name).toBe('Temp');
  });

  it('computeHistory routes non-numeric entities to the timeline and dedupes states', () => {
    const hass = makeHass({
      'binary_sensor.door': {
        entity_id: 'binary_sensor.door',
        state: 'off',
        attributes: {},
      },
    });

    const stateHistory: HistoryStates = {
      'binary_sensor.door': [
        { s: 'off', lu: 10 } as any,
        { s: 'off', lu: 20 } as any, // duplicate -> dropped
        { s: 'on', lu: 30 } as any,
      ],
    };

    const result = computeHistory(hass, stateHistory);

    expect(result.line).toHaveLength(0);
    expect(result.timeline).toHaveLength(1);
    expect(result.timeline[0].data.map((s) => s.state)).toEqual(['off', 'on']);
  });

  it('computeHistory groups entities by unit', () => {
    const hass = makeHass({
      'sensor.temp': {
        entity_id: 'sensor.temp',
        state: '21',
        attributes: { unit_of_measurement: '°C' },
      },
      'sensor.humidity': {
        entity_id: 'sensor.humidity',
        state: '55',
        attributes: { unit_of_measurement: '%' },
      },
    });

    const result = computeHistory(hass, {
      'sensor.temp': [{ s: '21', lu: 1 } as any],
      'sensor.humidity': [{ s: '55', lu: 1 } as any],
    });

    expect(result.line.map((line) => line.unit).sort()).toEqual(['%', '°C']);
  });
});

describe('Charts - formatNumber', () => {
  const locale = {
    language: 'en',
    number_format: NumberFormat.comma_decimal,
    time_format: TimeFormat.language,
  };

  it('formats with thousands separators', () => {
    expect(formatNumber(1234.56, locale)).toBe('1,234.56');
  });

  it('keeps trailing zeros of string values', () => {
    expect(formatNumber('57.00', locale)).toBe('57.00');
  });

  it('returns non-numeric strings unchanged', () => {
    expect(formatNumber('unavailable', locale)).toBe('unavailable');
  });

  it('maps number formats to locales', () => {
    expect(numberFormatToLocale(locale)).toEqual(['en-US', 'en']);
    expect(
      numberFormatToLocale({
        ...locale,
        number_format: NumberFormat.language,
      })
    ).toBe('en');
  });
});

describe('Charts - applyThemesOnElement', () => {
  it('sets and resets CSS variables directly on plain elements', () => {
    const element = document.createElement('div');
    const themes = {
      default_theme: 'default',
      default_dark_theme: null,
      darkMode: false,
      theme: 'default',
      themes: {
        my_theme: {
          'primary-color': '#123456',
          'gauge-color': 'red',
        },
      },
    } as unknown as Themes;

    applyThemesOnElement(element, themes, 'my_theme');

    expect(element.style.getPropertyValue('--primary-color')).toBe('#123456');
    expect(element.style.getPropertyValue('--gauge-color')).toBe('red');
    // derived rgb variable for hex colors
    expect(element.style.getPropertyValue('--rgb-primary-color')).toBe(
      '18,52,86'
    );

    //

    // Switching to an unknown theme resets the previously set variables
    applyThemesOnElement(element, themes, 'unknown_theme');
    expect(element.style.getPropertyValue('--primary-color')).toBe('');
    expect(element.style.getPropertyValue('--gauge-color')).toBe('');
  });
});

describe('Charts - gauge', () => {
  it('getAngle maps values onto the 180 degree dial', () => {
    expect(getAngle(0, 0, 100)).toBe(0);
    expect(getAngle(50, 0, 100)).toBe(90);
    expect(getAngle(100, 0, 100)).toBe(180);
    expect(getAngle(150, 0, 100)).toBe(180); // clamped
    expect(getAngle(-10, 0, 100)).toBe(0); // clamped
  });

  const renderGauge = (
    config: Record<string, any>,
    state = '70'
  ): { svg: SVGElement; styles: string } => {
    const card = new HuiGaugeCard();
    let rendered: SVGElement | undefined;
    let styles = '';
    card.renderChart = async (svgElement, cssStyles) => {
      rendered = svgElement;
      styles = cssStyles;
    };
    card.setConfig(config as any);
    card.setHass(
      makeHass({
        'sensor.humidity': {
          entity_id: 'sensor.humidity',
          state,
          attributes: {
            unit_of_measurement: '%',
            friendly_name: 'Humidity',
          },
        },
      })
    );
    expect(rendered).toBeDefined();
    return { svg: rendered as SVGElement, styles };
  };

  it('renders a severity gauge with rotation and severity color', () => {
    const { svg, styles } = renderGauge({
      entity: 'sensor.humidity',
      min: 0,
      max: 100,
      severity: { green: 0, yellow: 60, red: 80 },
    });

    const valuePath = svg.querySelector('path.value') as SVGPathElement;
    expect(valuePath).not.toBeNull();
    expect(valuePath.getAttribute('style')).toContain('rotate(126deg)'); // 70%
    expect(svg.getAttribute('style')).toContain(
      '--gauge-color:var(--warning-color, #ffa600)'
    );
    expect(svg.textContent).toContain('70');
    expect(svg.textContent).toContain('Humidity');
    expect(styles).toContain('.needle');
  });

  it('renders a needle gauge with segments and segment label', () => {
    const { svg } = renderGauge({
      entity: 'sensor.humidity',
      min: 0,
      max: 100,
      needle: true,
      segments: [
        { from: 0, color: '#4caf50', label: 'OK' },
        { from: 60, color: '#f44336', label: 'High' },
      ],
    });

    const needle = svg.querySelector('path.needle') as SVGPathElement;
    expect(needle).not.toBeNull();
    expect(needle.getAttribute('style')).toContain('rotate(126deg)');

    const levels = Array.from(svg.querySelectorAll('path.level'));
    expect(
      levels.map((level) => level.getAttribute('stroke'))
    ).toEqual(expect.arrayContaining(['#4caf50', '#f44336']));

    // Segment label shown instead of the numeric value
    expect(svg.textContent).toContain('High');
  });
});

describe('Charts - getStateHistory sandbox helper', () => {
  it('fetches the last 24h of history via the history WS API', async () => {
    const callWS = makeCallWS({
      'sensor.power': [
        { s: '1', lu: 1 },
        { s: '2', lu: 2 },
      ],
    });
    const hass = makeHass({}, callWS);
    const actionConfig = {
      action: 'call-service',
      service: 'floorplan.chart_set',
    } as FloorplanCallServiceActionConfig;

    const fetcher = getThrottledStateHistoryFetcher(actionConfig);
    const result = await fetcher(hass, 'sensor.power');

    expect(result['sensor.power']).toHaveLength(2);
    expect(callWS).toHaveBeenCalledTimes(1);
    const message = callWS.mock.calls[0][0];
    expect(message.type).toBe('history/history_during_period');
    expect(message.entity_ids).toEqual(['sensor.power']);
    expect(message.minimal_response).toBe(true);
    const windowMs =
      new Date(message.end_time).getTime() -
      new Date(message.start_time).getTime();
    expect(windowMs).toBe(24 * 60 * 60 * 1000);
  });

  it('reuses the same throttled fetcher per action config', () => {
    const actionConfig = {
      action: 'call-service',
      service: 'floorplan.chart_set',
    } as FloorplanCallServiceActionConfig;
    const otherActionConfig = {
      action: 'call-service',
      service: 'floorplan.chart_set',
    } as FloorplanCallServiceActionConfig;

    expect(getThrottledStateHistoryFetcher(actionConfig)).toBe(
      getThrottledStateHistoryFetcher(actionConfig)
    );
    expect(getThrottledStateHistoryFetcher(actionConfig)).not.toBe(
      getThrottledStateHistoryFetcher(otherActionConfig)
    );
  });

  it('throttles fetches to one per refresh interval', async () => {
    const callWS = makeCallWS({});
    const hass = makeHass({}, callWS);
    const actionConfig = {
      action: 'call-service',
      service: 'floorplan.chart_set',
    } as FloorplanCallServiceActionConfig;

    // 50ms interval so the test runs with real timers
    const fetcher = getThrottledStateHistoryFetcher(actionConfig, 0.05);

    const first = fetcher(hass, 'sensor.power');
    const second = fetcher(hass, 'sensor.power');
    await first;
    expect(callWS).toHaveBeenCalledTimes(1); // second call is queued

    await second;
    expect(callWS).toHaveBeenCalledTimes(2);
  });

  it('is exposed to chart_set templates via the evaluation sandbox', async () => {
    const callWS = makeCallWS({
      'sensor.power': [
        { s: '100', lu: 1700000000 },
        { s: '150', lu: 1700000060 },
      ],
    });
    const hass = makeHass(
      {
        'sensor.power': {
          entity_id: 'sensor.power',
          state: '150',
          attributes: {},
        },
      },
      callWS
    );
    const actionConfig = {
      action: 'call-service',
      service: 'floorplan.chart_set',
      service_data: 'placeholder',
    } as unknown as FloorplanCallServiceActionConfig;

    const expression = `>
      const history = await getStateHistory('sensor.power');
      const series = history['sensor.power'].map(s => ({ x: (s.lc ?? s.lu) * 1000, y: Number(s.s) }));
      return JSON.stringify({ type: 'apex-chart', points: series });
    `;

    const result = await Promise.resolve(
      EvalHelper.evaluate(
        expression,
        hass,
        {} as FloorplanConfig,
        'sensor.power',
        undefined,
        {},
        {},
        undefined,
        undefined,
        undefined,
        actionConfig
      )
    );

    const parsed = JSON.parse(result as string);
    expect(parsed.type).toBe('apex-chart');
    expect(parsed.points).toEqual([
      { x: 1700000000000, y: 100 },
      { x: 1700000060000, y: 150 },
    ]);
    expect(callWS).toHaveBeenCalledTimes(1);
  });
});

describe('Evaluation sandbox - modern syntax', () => {
  it('parses optional chaining and nullish coalescing in code-line templates', () => {
    const hass = makeHass({
      'sensor.grid_import_filtered': {
        entity_id: 'sensor.grid_import_filtered',
        state: '0',
        attributes: {},
      },
    });

    const expression =
      '${parseFloat(hass.states["sensor.grid_export_missing"]?.state ?? "0") == 0 ? "always-visible" : "always-invisible"}';

    const result = EvalHelper.evaluate(
      expression,
      hass,
      {} as FloorplanConfig,
      'sensor.grid_import_filtered'
    );

    expect(result).toBe('always-visible');
  });
});

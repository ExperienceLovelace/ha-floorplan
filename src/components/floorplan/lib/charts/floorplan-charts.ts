/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * ChartHandler dispatches the floorplan.chart_set service to one of the
 * chart implementations. Chart instances are keyed per action config so
 * each chart_set action keeps a persistent chart across state changes,
 * which the history card's caching and the first render logic rely on.
 *
 * The statistics-graph type is accepted but routed to HistoryGraphChart.
 * Long term statistics are not fetched.
 */

import { renderApexChart } from './chart-util';
import { HuiHistoryGraphCard } from './hui-history-graph-card';
import { HuiGaugeCard } from './hui-gauge-card';
import { applyThemesOnElement } from '../../../../lib/homeassistant/common/dom/apply_themes_on_element';
import { createSvgGroup, createSvgRect, replaceSvgElement } from './svg-util';
import { HomeAssistant } from '../../../../lib/homeassistant/types';
import { FloorplanSvgElementInfo } from '../floorplan-info';
import { FloorplanCallServiceActionConfig } from '../floorplan-config';

// callback(isFirstRender, stylesToInjectIntoRenderRoot)
export type ChartCallback = (isFirstRender: boolean, styles: string) => void;

export class FloorplanChart {
  _isFirstRender = true;

  constructor(
    public svgElementInfo: FloorplanSvgElementInfo,
    public actionConfig: FloorplanCallServiceActionConfig,
    public callback?: ChartCallback
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  render(hass: HomeAssistant, serviceData: Record<string, any>): void {
    /* overridden */
  }
}

export class HistoryGraphChart extends FloorplanChart {
  _chart?: HuiHistoryGraphCard;

  render(hass: HomeAssistant, serviceData: Record<string, any>): void {
    if (!this._chart) this._chart = new HuiHistoryGraphCard();

    // The card port calls renderChart(apexOptions) instead of rendering Lit
    // templates. Bind a context object so renderChart sees the current
    // serviceData and first-render flag.
    this._chart.renderChart = this.renderChart.bind({
      floorplanChart: this,
      serviceData,
      isFirstRender: this._isFirstRender,
    });
    if (this._isFirstRender) this._chart.setConfig(serviceData as any);
    this._chart.setHass(hass);
  }

  // 'this' is the bound context object above, not the class instance.
  async renderChart(
    this: {
      floorplanChart: HistoryGraphChart;
      serviceData: Record<string, any>;
      isFirstRender: boolean;
    },
    options: Record<string, any>
  ): Promise<void> {
    const { floorplanChart, serviceData, isFirstRender } = this;

    if (serviceData.theme) {
      options.theme = options.theme ?? {};
      options.theme.mode = serviceData.theme; // ApexCharts 'light' | 'dark'
    }
    if (serviceData.background) {
      if (!options.chart) options.chart = {};
      options.chart.background = serviceData.background;
    }

    await renderApexChart(
      floorplanChart.svgElementInfo,
      options,
      serviceData.apex_chart_options
    );
    floorplanChart.callback?.(isFirstRender, HuiHistoryGraphCard.styles);
    floorplanChart._isFirstRender = false;
  }
}

export class GaugeChart extends FloorplanChart {
  _chart?: HuiGaugeCard;

  render(hass: HomeAssistant, serviceData: Record<string, any>): void {
    if (!this._chart) this._chart = new HuiGaugeCard();

    this._chart.renderChart = this.renderChart.bind({
      floorplanChart: this,
      hass,
      serviceData,
      isFirstRender: this._isFirstRender,
    });
    if (this._isFirstRender) this._chart.setConfig(serviceData as any);
    // Allows overriding the displayed value via service_data.value
    // (evaluated expression), else the entity state is used.
    this._chart.getValue = (stateObj) =>
      serviceData.value !== undefined ? serviceData.value : stateObj.state;
    this._chart.setHass(hass);
  }

  // The gauge is already an SVG string (ha-gauge port); no ApexCharts here.
  // Embed it directly into the floorplan group.
  async renderChart(
    this: {
      floorplanChart: GaugeChart;
      hass: HomeAssistant;
      serviceData: Record<string, any>;
      isFirstRender: boolean;
    },
    gaugeSvgElement: SVGElement,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _styles: string
  ): Promise<void> {
    const { floorplanChart, hass, serviceData, isFirstRender } = this;

    embedSvgInFloorplan(
      floorplanChart.svgElementInfo,
      { background: serviceData.background },
      gaugeSvgElement
    );

    // The gauge supports Home Assistant themes. The ApexCharts based
    // charts use the ApexCharts light and dark theme modes instead.
    if (
      serviceData.theme &&
      hass.themes &&
      floorplanChart.svgElementInfo.svgElement
    ) {
      applyThemesOnElement(
        floorplanChart.svgElementInfo.svgElement,
        hass.themes,
        serviceData.theme
      );
    }

    floorplanChart.callback?.(isFirstRender, HuiGaugeCard.styles);
    floorplanChart._isFirstRender = false;
  }
}

function embedSvgInFloorplan(
  svgElementInfo: FloorplanSvgElementInfo,
  options: { background?: string },
  chartSvg: SVGElement
): void {
  const bbox = svgElementInfo.originalBBox;
  if (!bbox) {
    throw new Error(
      `Cannot render chart: element '${svgElementInfo.entityId}' has no bounding box`
    );
  }

  let group: SVGGraphicsElement;
  if (svgElementInfo?.svgElement?.nodeName === 'g') {
    group = svgElementInfo.svgElement;
  } else {
    group = createSvgGroup(bbox.x, bbox.y, bbox.width, bbox.height);
    svgElementInfo.svgElement = replaceSvgElement(
      svgElementInfo.svgElement,
      group
    );
  }
  group.classList.add('floorplan-chart');

  let backgroundRect: SVGRectElement | undefined;
  if (options?.background) {
    backgroundRect = createSvgRect(bbox.x, bbox.y, bbox.width, bbox.height);
    backgroundRect.style.fill = options.background;
    backgroundRect.classList.add('floorplan-chart-background');
  }

  chartSvg.setAttribute('x', group.getAttribute('x') as string);
  chartSvg.setAttribute('y', group.getAttribute('y') as string);
  chartSvg.setAttribute('width', group.getAttribute('width') as string);
  chartSvg.setAttribute('height', group.getAttribute('height') as string);

  group.textContent = '';
  group.appendChild(chartSvg);
  if (backgroundRect) group.prepend(backgroundRect);
}

/*
 * Renders raw ApexCharts options from service_data.apex_chart_options.
 * Combined with the sandbox getStateHistory() helper (see
 * get-state-history.ts), templates can fetch history, build any series
 * shape, and return { type: 'apex-chart', refresh_interval,
 * apex_chart_options } for a fully custom chart.
 */
export class ApexChart extends FloorplanChart {
  async render(
    _hass: HomeAssistant,
    serviceData: Record<string, any>
  ): Promise<void> {
    await renderApexChart(this.svgElementInfo, serviceData.apex_chart_options);
    this.callback?.(this._isFirstRender, '');
    this._isFirstRender = false;
  }
}

export class ChartHandler {
  static _chartMap = new Map<
    FloorplanCallServiceActionConfig,
    FloorplanChart
  >();

  static async chartSet(
    hass: HomeAssistant,
    svgElementInfo: FloorplanSvgElementInfo,
    actionConfig: FloorplanCallServiceActionConfig,
    serviceData: Record<string, any>,
    callback?: ChartCallback
  ): Promise<void> {
    // One chart instance per ACTION CONFIG, kept alive across state changes
    // so the history card's throttle/cache and isFirstRender logic work.
    let chart = this._chartMap.get(actionConfig);
    if (!chart) {
      switch (serviceData.type) {
        case 'apex-chart':
          chart = new ApexChart(svgElementInfo, actionConfig, callback);
          break;
        case 'history-graph':
        case 'statistics-graph': // same implementation as history-graph
          chart = new HistoryGraphChart(svgElementInfo, actionConfig, callback);
          break;
        case 'gauge':
          chart = new GaugeChart(svgElementInfo, actionConfig, callback);
          break;
      }
      if (chart) this._chartMap.set(actionConfig, chart);
    }
    await chart?.render(hass, serviceData);
  }
}

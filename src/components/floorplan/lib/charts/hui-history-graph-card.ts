/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Ports of the Home Assistant state-history-charts and history graph card
 * as plain classes, with rendering delegated to renderChart.
 *
 * Limitations:
 * - A single StateHistoryChartLine instance is reused, so when entities
 *   have mixed units only the last unit group is drawn.
 * - Timeline (non numeric) entities are skipped.
 */

import { StateHistoryChartLine, RenderChartFn } from './state-history-chart-line';
import { HistoryResult } from '../../../../lib/homeassistant/data/history';
import {
  getRecentWithCache,
  CacheConfig,
} from '../../../../lib/homeassistant/data/cached-history';
import {
  processConfigEntities,
  EntityConfig,
} from '../../../../lib/homeassistant/panels/lovelace/common/process-config-entities';
import { throttle } from '../../../../lib/homeassistant/common/util/throttle';
import { HomeAssistant } from '../../../../lib/homeassistant/types';

export class StateHistoryCharts {
  hass?: HomeAssistant;
  historyData!: HistoryResult;
  names: Record<string, string> = {};
  title?: string;
  upToNow = false;
  showNames = true;
  isLoadingData = false;
  endTime?: Date;
  renderChart?: RenderChartFn;

  stateHistoryChartLine = new StateHistoryChartLine();
  private _computedEndTime!: Date;

  static get styles(): string {
    return StateHistoryChartLine.styles;
  }

  triggerRender(): void {
    this.render();
  }

  render(): void {
    if (this._isHistoryEmpty()) return;

    const now = new Date();
    this._computedEndTime =
      this.upToNow || !this.endTime || this.endTime > now ? now : this.endTime;

    const combinedItems: unknown[] = this.historyData.timeline.length
      ? ([this.historyData.timeline] as unknown[]).concat(
          this.historyData.line
        )
      : this.historyData.line;

    combinedItems.forEach((item, index) =>
      this._renderHistoryItem(item, index)
    );
  }

  private _renderHistoryItem = (item: unknown, index: number): void => {
    if (!item || index === undefined) return;
    // Timeline entries come as an array -> skipped (not ported).
    if (Array.isArray(item)) return;

    const line = item as { identifier: string; unit: string; data: any[] };
    this.stateHistoryChartLine.renderChart = this.renderChart;
    this.stateHistoryChartLine.identifier = line.identifier;
    this.stateHistoryChartLine.title = this.title;
    this.stateHistoryChartLine.showNames = this.showNames;
    this.stateHistoryChartLine.names = this.names;
    this.stateHistoryChartLine.hass = this.hass;
    this.stateHistoryChartLine.unit = line.unit;
    this.stateHistoryChartLine.data = line.data;
    this.stateHistoryChartLine.endTime = this._computedEndTime;
    this.stateHistoryChartLine.triggerWillUpdate();
  };

  private _isHistoryEmpty(): boolean {
    const historyDataEmpty =
      !this.historyData ||
      !this.historyData.timeline ||
      !this.historyData.line ||
      (this.historyData.timeline.length === 0 &&
        this.historyData.line.length === 0);
    return !this.isLoadingData && historyDataEmpty;
  }
}

export interface HistoryGraphCardConfig {
  entities: (string | EntityConfig)[];
  title?: string;
  hours_to_show?: number;
  refresh_interval?: number; // seconds, default 10
  show_names?: boolean; // whether the legend is shown, default true
  [key: string]: unknown;
}

export class HuiHistoryGraphCard {
  hass?: HomeAssistant;
  renderChart?: RenderChartFn;

  private _config?: HistoryGraphCardConfig;
  private _configEntities?: EntityConfig[];
  private _names: Record<string, string> = {};
  private _fetching = false;
  private _stateHistory?: HistoryResult;
  private _cacheConfig!: CacheConfig;
  private _throttleGetStateHistory?: () => void;
  private _stateHistoryCharts = new StateHistoryCharts();

  static get styles(): string {
    return StateHistoryCharts.styles;
  }

  setConfig(config: HistoryGraphCardConfig): void {
    if (!config.entities || !Array.isArray(config.entities)) {
      throw new Error('Entities need to be an array');
    }
    if (!config.entities.length) {
      throw new Error('You must include at least one entity');
    }

    this._configEntities = config.entities
      ? processConfigEntities(config.entities)
      : [];

    const entityIds: string[] = [];
    this._configEntities.forEach((entity) => {
      entityIds.push(entity.entity);
      if (entity.name) this._names[entity.entity] = entity.name;
    });

    this._throttleGetStateHistory = throttle(() => {
      this._getStateHistory();
    }, (config.refresh_interval as number) * 1000 || 10000);

    this._cacheConfig = {
      cacheKey: entityIds.join(),
      hoursToShow: config.hours_to_show || 24,
    };

    this._config = config;
    this.render();
  }

  setHass(hass: HomeAssistant): void {
    this.hass = hass;
    this._throttleGetStateHistory?.();
  }

  render(): void {
    if (!this.hass || !this._config) return;
    this._stateHistoryCharts.renderChart = this.renderChart;
    this._stateHistoryCharts.title = this._config.title;
    this._stateHistoryCharts.names = this._names;
    this._stateHistoryCharts.showNames =
      this._config.show_names === undefined || this._config.show_names;
    this._stateHistoryCharts.hass = this.hass;
    this._stateHistoryCharts.historyData = this._stateHistory as HistoryResult;
    this._stateHistoryCharts.triggerRender();
  }

  private async _getStateHistory(): Promise<void> {
    if (this._fetching) return;
    this._fetching = true;
    try {
      this._stateHistory = {
        ...(await getRecentWithCache(
          this.hass as HomeAssistant,
          this._cacheConfig.cacheKey,
          this._cacheConfig,
          (this.hass as HomeAssistant).language ?? 'en'
        )),
      };
    } finally {
      this._fetching = false;
    }
    this.render();
  }
}

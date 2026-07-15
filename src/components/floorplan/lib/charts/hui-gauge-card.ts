/*
 * Ported from ha-floorplan v1.0.36beta181. Ports of HA frontend's
 * hui-gauge-card and ha-gauge, de-Lit-ified. The gauge builds an SVG string
 * directly (no ApexCharts) and hands the resulting SVGElement to
 * renderChart, which embeds it in the floorplan.
 *
 * Config surface matches HA's gauge card: entity, name, unit, min, max,
 * needle, severity{red,green,yellow}, segments[{from,color,label}].
 * Floorplan extension: label on segments (shown instead of the numeric
 * value).
 */

import {
  formatNumber,
  blankBeforePercent,
} from '../../../../lib/homeassistant/common/number/format_number';
import {
  FrontendLocaleData,
  NumberFormat,
  TimeFormat,
} from '../../../../lib/homeassistant/data/translation';
import { computeStateNameFromEntityAttributes } from '../../../../lib/homeassistant/data/history';
import { HomeAssistant } from '../../../../lib/homeassistant/types';
import { HassEntity } from 'home-assistant-js-websocket';

export type RenderGaugeFn = (
  svgElement: SVGElement,
  styles: string
) => Promise<void>;

// Fallback colors (HA's defaults) apply when the HA theme variables are
// not defined, e.g. in the examples/demo pages.
const severityMap: Record<string, string> = {
  red: 'var(--error-color, #db4437)',
  green: 'var(--success-color, #43a047)',
  yellow: 'var(--warning-color, #ffa600)',
  normal: 'var(--info-color, #039be5)',
};

export interface GaugeSegment {
  from: number;
  color: string;
  label?: string;
}

export interface GaugeCardConfig {
  entity: string;
  name?: string;
  unit?: string;
  min?: number;
  max?: number;
  needle?: boolean;
  severity?: Record<string, number>;
  segments?: GaugeSegment[];
  // floorplan extras handled by GaugeChart: value, background, theme
  [key: string]: unknown;
}

const isValidEntityId = (entityId: string): boolean =>
  /^(\w+)\.(\w+)$/.test(entityId);

export class HuiGaugeCard {
  hass?: HomeAssistant;
  renderChart?: RenderGaugeFn;
  getValue?: (stateObj: HassEntity) => number | string;

  private _config?: GaugeCardConfig;
  private _gauge = new HaGauge();

  static get styles(): string {
    return HaGauge.styles;
  }

  setHass(hass: HomeAssistant): void {
    this.hass = hass;
    this.render();
  }

  setConfig(config: GaugeCardConfig): void {
    if (!config.entity) throw new Error('Entity must be specified');
    if (!isValidEntityId(config.entity)) throw new Error('Invalid entity');
    this._config = { min: 0, max: 100, ...config };
    this.render();
  }

  async render(): Promise<void> {
    if (!this._config || !this.hass) return;
    const stateObj = this.hass.states[this._config.entity];
    if (!stateObj) return;

    const value = this.getValue
      ? Number(this.getValue(stateObj))
      : Number(stateObj.state);
    const name =
      this._config.name ??
      computeStateNameFromEntityAttributes(
        stateObj.entity_id,
        stateObj.attributes
      );

    this._gauge.min = this._config.min as number;
    this._gauge.max = this._config.max as number;
    this._gauge.value = value;
    this._gauge.locale = this.hass.locale ?? {
      language: this.hass.language ?? 'en',
      number_format: NumberFormat.language,
      time_format: TimeFormat.language,
    };
    this._gauge.label =
      this._config.unit ||
      (stateObj.attributes.unit_of_measurement as string) ||
      '';
    this._gauge.style = `--gauge-color:${
      this._computeSeverity(value) ?? severityMap.normal
    };`;
    this._gauge.needle = this._config.needle;
    this._gauge.levels = this._config.needle
      ? this._severityLevels()
      : undefined;
    this._gauge.title = name;
    this._gauge.renderChart = this.renderChart;
    this._gauge.triggerRender();
  }

  private _computeSeverity(numberValue: number): string | undefined {
    if (this._config?.needle) return undefined;

    // new format (segments)
    let segments = this._config?.segments;
    if (segments) {
      segments = [...segments].sort((a, b) => a?.from - b?.from);
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        if (
          segment &&
          numberValue >= segment.from &&
          (i + 1 === segments.length || numberValue < segments[i + 1]?.from)
        ) {
          return segment.color;
        }
      }
      return severityMap.normal;
    }

    // old format (severity)
    const sections = this._config?.severity;
    if (!sections) return severityMap.normal;

    const sectionsArray = Object.keys(sections).map(
      (severity) => [severity, sections[severity]] as [string, number]
    );
    for (const severity of sectionsArray) {
      if (severityMap[severity[0]] == null || isNaN(severity[1])) {
        return severityMap.normal;
      }
    }
    sectionsArray.sort((a, b) => a[1] - b[1]);

    if (
      numberValue >= sectionsArray[0][1] &&
      numberValue < sectionsArray[1][1]
    ) {
      return severityMap[sectionsArray[0][0]];
    }
    if (
      numberValue >= sectionsArray[1][1] &&
      numberValue < sectionsArray[2][1]
    ) {
      return severityMap[sectionsArray[1][0]];
    }
    if (numberValue >= sectionsArray[2][1]) {
      return severityMap[sectionsArray[2][0]];
    }
    return severityMap.normal;
  }

  private _severityLevels(): {
    level: number;
    stroke: string;
    label?: string;
  }[] {
    // new format
    const segments = this._config?.segments;
    if (segments) {
      return segments.map((segment) => ({
        level: segment?.from,
        stroke: segment?.color,
        label: segment?.label,
      }));
    }
    // old format
    const sections = this._config?.severity;
    if (!sections) return [{ level: 0, stroke: severityMap.normal }];
    return Object.keys(sections).map((severity) => ({
      level: sections[severity],
      stroke: severityMap[severity],
    }));
  }
}

/* ------------------------------------------------------------------ */
/* ha-gauge port                                                       */
/* ------------------------------------------------------------------ */

export const getAngle = (value: number, min: number, max: number): number => {
  const clamped =
    isNaN(value) || isNaN(min) || isNaN(max)
      ? 0
      : value > max
      ? max
      : value < min
      ? min
      : value;
  const percentage = (100 * (clamped - min)) / (max - min);
  return (180 * percentage) / 100;
};

export class HaGauge {
  min = 0;
  max = 100;
  value = 0;
  label = '';
  title?: string;
  valueText?: string;
  needle?: boolean;
  levels?: { level: number; stroke: string; label?: string }[];
  locale!: FrontendLocaleData;
  style = '';
  renderChart?: RenderGaugeFn;

  private _angle = 0;
  private _segment_label = '';
  private _svgElement?: SVGElement;

  triggerRender(): void {
    this._angle = getAngle(this.value, this.min, this.max);
    this._segment_label = this.getSegmentLabel();
    this.render();
  }

  render(): void {
    const titleOffset = this.title ? 10 : 0;
    const viewBoxHeight = this.title ? 50 + titleOffset : 50;
    const svg = `
      <svg viewBox="0 0 100 ${viewBoxHeight}" style="${this.style}">
        <svg viewBox="-50 -50 100 50" class="gauge" width="100" height="50" y="${
          -titleOffset / 2
        }">
          ${
            this.needle && this.levels
              ? ''
              : `<path class="dial" d="M -40 0 A 40 40 0 0 1 40 0"></path>`
          }
          ${
            this.levels
              ? this.levels
                  .sort((a, b) => a.level - b.level)
                  .map((level, idx) => {
                    let firstPath = '';
                    if (idx === 0 && level.level !== this.min) {
                      const angle = getAngle(this.min, this.min, this.max);
                      firstPath = `<path stroke="var(--info-color)" class="level"
                        d="M ${0 - 40 * Math.cos((angle * Math.PI) / 180)}
                           ${0 - 40 * Math.sin((angle * Math.PI) / 180)}
                         A 40 40 0 0 1 40 0"></path>`;
                    }
                    const angle = getAngle(level.level, this.min, this.max);
                    return `${firstPath}<path stroke="${level.stroke}" class="level"
                      d="M ${0 - 40 * Math.cos((angle * Math.PI) / 180)}
                         ${0 - 40 * Math.sin((angle * Math.PI) / 180)}
                       A 40 40 0 0 1 40 0"></path>`;
                  })
                  .join('')
              : ''
          }
          ${
            this.needle
              ? `<path class="needle" d="M -25 -2.5 L -47.5 0 L -25 2.5 z"
                   style="transform: rotate(${this._angle}deg)">`
              : `<path class="value" d="M -40 0 A 40 40 0 1 0 40 0"
                   style="transform: rotate(${this._angle}deg)">`
          }
          </path>
        </svg>
        <svg class="text" viewBox="0 0 100 ${viewBoxHeight}" x="50" y="49">
          <g transform="scale(0.32 0.32)">
            <text class="value-text">
            ${
              this._segment_label
                ? this._segment_label
                : this.valueText || formatNumber(this.value, this.locale)
            }${
      this._segment_label
        ? ''
        : this.label === '%'
        ? blankBeforePercent(this.locale) + '%'
        : ` ${this.label}`
    }
            </text>
          </g>
        </svg>
        ${
          this.title
            ? `<svg class="text" viewBox="0 0 100 ${viewBoxHeight}" x="50" y="${
                50 + titleOffset - 1
              }">
          <g transform="scale(0.32 0.32)">
              <text class="name-text">
              ${this.title}
              </text>
            </g>
          </svg>`
            : ''
        }
      </svg>
    `;

    const container = document.createElement('div');
    container.innerHTML = svg.trim();
    this._svgElement = container.firstChild as SVGElement;
    if (this.renderChart) this.renderChart(this._svgElement, HaGauge.styles);
  }

  getSegmentLabel(): string {
    if (this.levels) {
      this.levels.sort((a, b) => a.level - b.level);
      for (let i = this.levels.length - 1; i >= 0; i--) {
        if (this.value >= this.levels[i].level) {
          return this.levels[i].label ?? '';
        }
      }
    }
    return '';
  }

  static get styles(): string {
    return `
      .dial {
        fill: none;
        stroke: var(--primary-background-color, #e8e8e8);
        stroke-width: 15;
      }

      .value {
        fill: none;
        stroke-width: 15;
        stroke: var(--gauge-color, #039be5);
        transition: all 1s ease 0s;
      }

      .needle {
        fill: var(--primary-text-color, #212121);
        transition: all 1s ease 0s;
      }

      .level {
        fill: none;
        stroke-width: 15;
      }

      .gauge {
        display: block;
      }

      .text {
        overflow: visible;
      }

      .value-text {
        font-size: 50px;
        fill: var(--primary-text-color, #212121);
        text-anchor: middle;
      }

      .name-text {
        font-size: 20px;
        fill: var(--primary-text-color, #212121);
        text-anchor: middle;
      }
    `;
  }
}

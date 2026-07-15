/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Ported from ha-floorplan v1.0.36beta181. Port of HA frontend's
 * state-history-chart-line, de-Lit-ified into a plain class, with Chart.js
 * replaced by ApexCharts. The Lit lifecycle is emulated:
 * triggerWillUpdate() -> willUpdate(changedProps) -> render().
 *
 * SIMPLIFICATION vs HA (inherited from the beta): only the plain numeric
 * path of _generateData was kept. The climate/humidifier/water_heater
 * attribute series (hvac_action bands, target temps, etc.) were not ported.
 */

import { getColorByIndex } from '../../../../lib/homeassistant/common/color/colors';
import { HomeAssistant } from '../../../../lib/homeassistant/types';
import { LineChartUnit } from '../../../../lib/homeassistant/data/history';

export type RenderChartFn = (options: Record<string, any>) => Promise<void>;

interface ApexSeries {
  name: string;
  color: string;
  data: { x: number; y: number | null }[];
}

const safeParseFloat = (value: string): number | null => {
  const parsed = parseFloat(value);
  return isFinite(parsed) ? parsed : null;
};

export class StateHistoryChartLine {
  data: LineChartUnit['data'] = [];
  names: Record<string, string> | false = false;
  showNames = true;
  unit?: string;
  identifier?: string;
  title?: string;
  hass?: HomeAssistant;
  endTime!: Date;
  renderChart?: RenderChartFn;

  private _chartTime: Date = new Date();
  private _chartOptions?: Record<string, any>;
  private _chartData?: ApexSeries[];
  private hasUpdated = false;

  triggerWillUpdate(): void {
    this.willUpdate(new Map([['data', this.data]]));
    this.hasUpdated = true;
  }

  async render(): Promise<void> {
    if (this._chartOptions && this._chartData && this.renderChart) {
      this._chartOptions.series = this._chartData;
      await this.renderChart(this._chartOptions);
    }
  }

  willUpdate(changedProps: Map<string, unknown>): void {
    if (!this.hasUpdated || changedProps.has('showNames')) {
      this._chartOptions = this.getChartOptions();
    }
    // Regenerate if data changed or chart is older than 5 minutes before endTime
    if (
      changedProps.has('data') ||
      this._chartTime < new Date(this.endTime.getTime() - 300000)
    ) {
      this._generateData();
    }
    this.render();
  }

  getChartOptions(): Record<string, any> {
    const options: Record<string, any> = {
      title: { offsetX: 15, style: { fontWeight: 'regular' } },
    };
    if (this.title) options.title.text = this.title;
    options.grid = {
      show: true,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: true } },
    };
    options.chart = { type: 'line' };
    options.legend = {
      show: this.showNames,
      showForSingleSeries: true,
      position: 'top',
      fontSize: '10px',
      markers: { height: 8, width: 8 },
      onItemHover: { highlightDataSeries: false },
      onItemClick: { toggleDataSeries: false },
    };
    options.dataLabels = { enabled: false };
    options.stroke = { curve: 'stepline', width: 1 };
    options.xaxis = {
      type: 'datetime',
      labels: {
        datetimeUTC: false,
        style: { fontSize: '11px' },
        datetimeFormatter: { hour: 'h:mm tt' },
      },
      axisBorder: { show: false },
    };
    options.yaxis = {
      title: { text: this.unit, offsetX: 5, style: { fontWeight: 'regular' } },
      labels: {
        formatter: function (val: number) {
          return val.toFixed(0);
        },
      },
    };
    return options;
  }

  private _generateData(): void {
    let colorIndex = 0;
    const entityStates = this.data;
    const datasets: ApexSeries[] = [];
    if (entityStates.length === 0) return;

    this._chartTime = new Date();
    const endTime = this.endTime;
    const names = this.names || {};

    entityStates.forEach((states) => {
      const name =
        (names as Record<string, string>)[states.entity_id] || states.name;

      let prevValues: (number | null)[] | null = null;
      const data: ApexSeries[] = [];

      const pushData = (
        timestamp: Date,
        datavalues: (number | null)[] | null
      ) => {
        if (!datavalues) return;
        if (timestamp > endTime) return; // drop data beyond endTime
        data.forEach((d, i) => {
          if (datavalues[i] === null && prevValues && prevValues[i] !== null) {
            // null value: repeat last value to draw the drop as a step
            d.data.push({ x: timestamp.getTime(), y: prevValues[i] });
          }
          d.data.push({ x: timestamp.getTime(), y: datavalues[i] });
        });
        prevValues = datavalues;
      };

      const addDataSet = (nameY: string, color?: string) => {
        if (!color) {
          color = getColorByIndex(colorIndex);
          colorIndex++;
        }
        data.push({ name: nameY, color, data: [] });
      };

      // ----- numeric-state path only (see header note) -----
      addDataSet(name);

      let lastValue: number | undefined;
      let lastDate: Date | undefined;
      let lastNullDate: Date | null = null;

      states.states.forEach((entityState) => {
        const value = safeParseFloat(entityState.state);
        const date = new Date(entityState.last_changed);
        if (value !== null && lastNullDate) {
          // Interpolate across the unknown gap, break the line, then resume
          const dateTime = date.getTime();
          const lastNullDateTime = lastNullDate.getTime();
          const lastDateTime = lastDate?.getTime() as number;
          pushData(lastNullDate, [
            ((lastNullDateTime - lastDateTime) / (dateTime - lastDateTime)) *
              (value - (lastValue as number)) +
              (lastValue as number),
          ]);
          pushData(new Date(lastNullDateTime + 1), [null]);
          pushData(date, [value]);
          lastDate = date;
          lastValue = value;
          lastNullDate = null;
        } else if (value !== null && lastNullDate === null) {
          pushData(date, [value]);
          lastDate = date;
          lastValue = value;
        } else if (
          value === null &&
          lastNullDate === null &&
          lastValue !== undefined
        ) {
          lastNullDate = date;
        }
      });

      pushData(endTime, prevValues); // extend last value to endTime
      Array.prototype.push.apply(datasets, data);
    });

    this._chartData = datasets;
  }

  static get styles(): string {
    return `
      .apexcharts-gridline,
      .apexcharts-xaxis-tick {
        opacity: 0.2;
      }

      .apexcharts-xcrosshairs,
      .apexcharts-ycrosshairs,
      .apexcharts-xaxistooltip-bottom {
        display: none;
      }

      .apexcharts-marker {
        display: none;
      }
    `;
  }
}

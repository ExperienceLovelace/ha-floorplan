/*
 * Composed ApexCharts build for the floorplan chart feature.
 *
 * ApexCharts 5 is modular: chart types and features are registered into a
 * shared core. The floorplan's apex-chart service is user-scriptable YAML,
 * so EVERY chart type stays available — but of the optional features only
 * legend and annotations are included. The others (toolbar, export menu,
 * keyboard navigation, morph animations, drilldown) are interactive-only
 * and can never work in the serialized static SVG the floorplan produces,
 * so excluding them just trims the bundle.
 *
 * Composed from apexcharts/src (an exported, tree-shakable surface of the
 * package) mirroring apexcharts/src/entries/full.js; the prebuilt dist
 * entries each bundle their own copy of shared chart code and would bloat
 * the bundle if combined.
 */

import ApexCharts from 'apexcharts/src/apexcharts';
import 'apexcharts/src/features/legend';
import 'apexcharts/src/features/annotations';
import Bar from 'apexcharts/src/charts/Bar';
import BarStacked from 'apexcharts/src/charts/BarStacked';
import BoxCandleStick from 'apexcharts/src/charts/BoxCandleStick';
import HeatMap from 'apexcharts/src/charts/HeatMap';
import Line from 'apexcharts/src/charts/Line';
import Pie from 'apexcharts/src/charts/Pie';
import Radar from 'apexcharts/src/charts/Radar';
import Radial from 'apexcharts/src/charts/Radial';
import RangeBar from 'apexcharts/src/charts/RangeBar';
import Treemap from 'apexcharts/src/charts/Treemap';
import Violin from 'apexcharts/src/charts/Violin';

ApexCharts.use({
  line: Line,
  area: Line,
  scatter: Line,
  bubble: Line,
  rangeArea: Line,
  bar: Bar,
  column: Bar,
  barStacked: BarStacked,
  rangeBar: RangeBar,
  candlestick: BoxCandleStick,
  boxPlot: BoxCandleStick,
  violin: Violin,
  pie: Pie,
  donut: Pie,
  polarArea: Pie,
  radialBar: Radial,
  radar: Radar,
  heatmap: HeatMap,
  treemap: Treemap,
});

export default ApexCharts;

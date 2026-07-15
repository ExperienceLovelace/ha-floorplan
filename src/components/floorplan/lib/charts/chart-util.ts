/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Ported from ha-floorplan v1.0.36beta181 (reconstructed from the minified
 * bundle; the feature was never merged to master).
 *
 * Core trick of the whole graph feature:
 * ApexCharts renders into an HTML <div> inside a <foreignObject>, then the
 * resulting <svg> is SERIALIZED and re-inserted as inline SVG inside the
 * floorplan's own SVG (group.innerHTML = chartSvg.outerHTML). The
 * foreignObject/div is only used as a temporary render surface.
 * This means the chart scales/pans with the floorplan like any other
 * element, at the cost of interactivity (tooltips/toolbar/animations are
 * forced off, since the chart is a static snapshot between renders).
 */

import ApexCharts from './apexcharts-loader';
import {
  createSvgGroup,
  createSvgRect,
  createSvgForeignObject,
  replaceSvgElement,
} from './svg-util';
import { FloorplanSvgElementInfo } from '../floorplan-info';

export async function renderApexChart(
  svgElementInfo: FloorplanSvgElementInfo,
  options: Record<string, any>,
  apexChartOptions?: Record<string, any>
): Promise<void> {
  const bbox = svgElementInfo.originalBBox;
  if (!bbox) {
    throw new Error(
      `Cannot render chart: element '${svgElementInfo.entityId}' has no bounding box`
    );
  }

  // Reuse the target element if it is already a <g>, otherwise replace the
  // rule's SVG element (e.g. a <rect> placeholder) with a new <g> of the
  // same id/classes at the same position.
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
  group.classList.add('apexcharts-canvas'); // so the ApexCharts CSS applies

  // Temporary render surface: <foreignObject><div/></foreignObject>
  let foreignObject = group.querySelector(
    ':scope > foreignObject'
  ) as SVGForeignObjectElement;
  if (!foreignObject) {
    foreignObject = createSvgForeignObject(
      bbox.x,
      bbox.y,
      bbox.width,
      bbox.height
    );
    group.appendChild(foreignObject);
  }
  let div = foreignObject.querySelector(':scope > div') as HTMLDivElement;
  if (!div) {
    div = document.createElement('div');
    foreignObject.appendChild(div);
  }

  await createApexChart(
    div,
    options,
    bbox.height,
    bbox.width,
    apexChartOptions
  );

  // Lift the rendered chart <svg> out of the div and inline it in the group.
  let chartSvg = div.querySelector('svg') as SVGSVGElement;

  // ApexCharts v4+ renders the legend as an absolutely-positioned HTML
  // sibling of the chart <svg> (v3 placed it in a foreignObject inside the
  // svg), so it would be lost when only the svg is serialized. Move it into
  // a foreignObject inside the svg at its measured position first.
  const externalLegend = div.querySelector(
    '.apexcharts-legend'
  ) as HTMLDivElement | null;
  if (
    externalLegend &&
    !chartSvg.contains(externalLegend) &&
    externalLegend.children.length
  ) {
    // Measure before reparenting; the temporary render surface is attached
    // to the DOM, so offsets reflect the legend's rendered position within
    // the chart canvas (the svg's coordinate space).
    const legendX = externalLegend.offsetLeft;
    const legendY = externalLegend.offsetTop;
    const legendWidth = externalLegend.offsetWidth;
    const legendHeight = externalLegend.offsetHeight;

    const legendForeignObject = createSvgForeignObject(
      legendX,
      legendY,
      legendWidth,
      legendHeight
    );
    legendForeignObject.appendChild(externalLegend);
    externalLegend.style.position = 'static';
    // Clear the absolute-positioning styles so the legacy (v3) legend
    // fix-up below leaves the placement we just measured untouched.
    externalLegend.style.left = '';
    externalLegend.style.top = '';
    externalLegend.style.right = '';
    externalLegend.style.bottom = '';
    chartSvg.appendChild(legendForeignObject);
  }
  chartSvg.setAttribute('x', bbox.x.toString());
  chartSvg.setAttribute('y', bbox.y.toString());
  chartSvg.setAttribute(
    'viewBox',
    `0 0 ${chartSvg.getAttribute('width')} ${chartSvg.getAttribute('height')}`
  );

  let backgroundRect: SVGRectElement | undefined;
  if (options.chart?.background) {
    backgroundRect = createSvgRect(bbox.x, bbox.y, bbox.width, bbox.height);
    backgroundRect.style.fill = options.chart.background;
    backgroundRect.classList.add('floorplan-chart-background');
  }

  group.innerHTML = chartSvg.outerHTML; // serialize; drops the foreignObject
  if (backgroundRect) group.prepend(backgroundRect);
  chartSvg = group.querySelector('svg') as SVGSVGElement;

  // ApexCharts renders the legend as absolutely-positioned HTML inside a
  // foreignObject. After serialization, fix its coordinates so it lands in
  // the right spot as static content.
  const legendDiv = chartSvg.querySelector('div') as HTMLDivElement;
  if (legendDiv) {
    legendDiv.style.position = 'static';
    const legendForeignObject = chartSvg.querySelector(
      'foreignObject'
    ) as SVGForeignObjectElement;
    if (legendForeignObject) {
      // A hidden/unpositioned legend has no left/top styles; only rewrite
      // the coordinates when they resolve to real numbers, otherwise keep
      // whatever ApexCharts set (writing "NaN" is an SVG attribute error).
      const legendX = parseFloat(legendDiv.style.left);
      // With legend position 'bottom', ApexCharts leaves top:'auto' and
      // positions via max-height; place the legend below the plot instead.
      const legendY =
        legendDiv.style.top !== 'auto'
          ? parseFloat(legendDiv.style.top)
          : parseFloat(legendDiv.style.maxHeight) + 10;
      if (isFinite(legendX)) {
        legendForeignObject.setAttribute('x', `${legendX}`);
      }
      if (isFinite(legendY)) {
        legendForeignObject.setAttribute('y', `${legendY}`);
      }
      legendForeignObject
        .querySelectorAll('span')
        .forEach((span) => (span.style.position = 'static'));
    }
  }
}

async function createApexChart(
  element: HTMLElement,
  options: Record<string, any>,
  height: number,
  width: number,
  apexChartOptions?: Record<string, any>
): Promise<ApexCharts> {
  // User-supplied overrides win over the generated options ('series' is the
  // one key protected from override).
  if (apexChartOptions) {
    for (const key in apexChartOptions) {
      if (!['series'].includes(key)) {
        options[key] = apexChartOptions[key];
      }
    }
  }

  // Force sizing to the target bbox and disable interactive features that
  // can't survive SVG serialization (toolbar, tooltips, animations).
  options.chart = options.chart ?? {};
  options.chart.height = height;
  options.chart.width = width;
  options.chart.toolbar = options.chart.toolbar ?? {};
  options.chart.toolbar.show = false;
  options.tooltip = options.tooltip ?? {};
  options.tooltip.enabled = false;
  options.chart.animations = options.chart.animations ?? {};
  options.chart.animations.enabled = false;

  element.textContent = '';
  const chart = new ApexCharts(element, options);
  await chart.render();
  return chart;
}

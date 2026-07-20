import { test, expect } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';

let devServer: ChildProcess;

// Extend Playwright's default timeout to 120 seconds
test.setTimeout(120000);

// Serve our examples suite
test.beforeAll('Setup webpack dev server with examples', async () => {
  devServer = spawn('npx', ['webpack', 'serve', '--mode=production'], {
    stdio: 'pipe',
    shell: false,
    detached: true, // Run in its own process group
  });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(
        new Error('webpack-dev-server did not start within the expected time.')
      );
    }, 30000);

    const handleOutput = (data: Buffer) => {
      const output = data.toString();
      console.log(output);
      if (output.includes('successfully')) {
        clearTimeout(timeout);
        resolve(true);
      }
    };

    devServer.stdout?.on('data', handleOutput);
    devServer.stderr?.on('data', handleOutput);

    devServer.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    devServer.on('exit', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(`webpack-dev-server exited with code ${code}`));
      }
    });
  });
});

test.afterAll(async () => {
  if (!devServer || devServer.pid === undefined) return;
  try {
    process.kill(-devServer.pid, 'SIGTERM');
    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        try {
          if (devServer.pid !== undefined) {
            process.kill(-devServer.pid, 'SIGKILL');
          }
        } catch (err) {
          // process group already gone
        }
        resolve(false);
      }, 10000);
      devServer.on('close', () => {
        clearTimeout(timeout);
        resolve(true);
      });
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code !== 'ESRCH') throw err;
  }
});

test('Charts: chart_set renders gauge and apex-chart into the floorplan SVG', async ({
  page,
}) => {
  page.on('console', (msg) => {
    console.log(`[FLOORPLAN PAGE LOG] ${msg.type()}: ${msg.text()}`);
  });
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  await page.goto('http://localhost:8080/index-chart_plate.html');

  // floorplan-example -> floorplan-card -> floorplan-element, each behind a
  // shadow root; resolve the floorplan element's shadow root for queries.
  const card = page.getByTestId('card-chart_plate');
  await card.waitFor({ timeout: 15000 });

  const queryFloorplan = async <T>(
    fn: (root: ShadowRoot) => T
  ): Promise<T> => {
    return card.evaluate((cardEl, fnBody) => {
      const floorplanElement = cardEl.shadowRoot?.querySelector(
        'floorplan-element'
      ) as Element;
      const root = floorplanElement?.shadowRoot as ShadowRoot;
      if (!root) throw new Error('floorplan-element shadow root not found');
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      return new Function('root', `return (${fnBody})(root);`)(root);
    }, fn.toString()) as Promise<T>;
  };

  // Wait until both charts have rendered (state changes drive rendering;
  // the simulation updates entities every second).
  await expect
    .poll(
      async () =>
        queryFloorplan((root) => {
          const gauge = root.querySelector('#my_gauge');
          const chart = root.querySelector('#my_chart');
          return {
            gaugeIsGroup: gauge?.nodeName === 'g',
            gaugeHasSvg: !!gauge?.querySelector('svg'),
            chartIsGroup: chart?.nodeName === 'g',
            chartHasSvg: !!chart?.querySelector('svg'),
          };
        }),
      { timeout: 30000 }
    )
    .toEqual({
      gaugeIsGroup: true,
      gaugeHasSvg: true,
      chartIsGroup: true,
      chartHasSvg: true,
    });

  // Gauge: the ha-gauge port must produce the dial/value paths and a
  // readable value text within the floorplan-chart group.
  const gauge = await queryFloorplan((root) => {
    const gaugeGroup = root.querySelector('#my_gauge') as SVGGElement;
    const valueText =
      gaugeGroup.querySelector('text.value-text')?.textContent?.trim() ?? '';
    return {
      classes: gaugeGroup.getAttribute('class') ?? '',
      hasValuePath: !!gaugeGroup.querySelector('path.value'),
      hasDialPath: !!gaugeGroup.querySelector('path.dial'),
      valueText,
    };
  });
  expect(gauge.classes).toContain('floorplan-chart');
  expect(gauge.hasValuePath).toBe(true);
  expect(gauge.hasDialPath).toBe(true);
  expect(gauge.valueText).toMatch(/\d+\s*%/);

  // Apex chart: serialized ApexCharts SVG inlined into the floorplan group,
  // with a drawn line series and a legend.
  const chart = await queryFloorplan((root) => {
    const chartGroup = root.querySelector('#my_chart') as SVGGElement;
    const chartSvg = chartGroup.querySelector('svg') as SVGSVGElement;
    const seriesPath = chartGroup.querySelector(
      '.apexcharts-line-series path, .apexcharts-series path'
    ) as SVGPathElement | null;
    const pathLength = seriesPath?.getAttribute('d')?.length ?? 0;
    const legendText =
      chartGroup
        .querySelector('.apexcharts-legend')
        ?.textContent?.trim() ?? '';

    // No serialized element may carry a NaN/negative-invalid attribute
    const badAttributes: string[] = [];
    chartGroup.querySelectorAll('*').forEach((element) => {
      for (const attr of Array.from(element.attributes)) {
        if (attr.value.includes('NaN')) {
          badAttributes.push(`${element.nodeName} ${attr.name}=${attr.value}`);
        }
      }
    });

    return {
      classes: chartGroup.getAttribute('class') ?? '',
      svgWidth: chartSvg?.getAttribute('width'),
      hasForeignObjectRenderSurface: !!chartGroup.querySelector(
        ':scope > foreignObject'
      ),
      pathLength,
      legendText,
      badAttributes,
    };
  });
  expect(chart.classes).toContain('floorplan-chart');
  expect(chart.classes).toContain('apexcharts-canvas');
  // The temporary render surface must be gone after serialization
  expect(chart.hasForeignObjectRenderSurface).toBe(false);
  // A real line was drawn (non-trivial path data)
  expect(chart.pathLength).toBeGreaterThan(20);
  expect(chart.legendText).toContain('CPU');
  expect(chart.badAttributes).toEqual([]);

  // No uncaught page errors while rendering
  expect(pageErrors).toEqual([]);

  // Screenshot for visual inspection of chart rendering
  await card.screenshot({
    path: 'test-results/e2e/chart-plate.png',
  });
});

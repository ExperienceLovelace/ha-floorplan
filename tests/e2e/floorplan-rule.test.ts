import { test, expect } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import { retry } from '../jest/jest-common-utils';

let devServer: ChildProcess; // Explicitly type devServer as ChildProcess

// Serve our examples suite
test.beforeAll('Setup webpack dev server with examples', async () => {
  devServer = spawn('npx', ['webpack-dev-server'], {
    stdio: 'pipe',
    shell: true,
  });

  // Wait for the server to start
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(
        new Error('webpack-dev-server did not start within the expected time.')
      );
    }, 60000); // 60 seconds timeout

    const handleOutput = (data: Buffer) => {
      const output = data.toString();
      console.log(output); // Log all output for debugging
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
}); // Extend Playwright's default timeout to 60 seconds

test.afterAll(() => {
  devServer.kill();
});

test('Log all content of the page', async ({ page }) => {
  // Capture console logs from the page
  page.on('console', (msg) => {
    console.log(`[FLOORPLAN PAGE LOG] ${msg.type()}: ${msg.text()}`);
  });

  await page.goto('http://localhost:8080'); // Navigate to the local dev server

  // Make sure that the floorplan example is loaded, and ready to be tested
  // Else, you'll face a situation where the simulator does toggle the state, but no rules are triggered
  await page.waitForTimeout(5000);

  // Try and get 'example-home' from the original page
  const exampleHome = await page.getByTestId('element-Home');
  if (!exampleHome) {
    throw new Error('example-home not found');
  }
  // Access the shadow root of the example-home element
  const exampleHomeShadowRoot = await exampleHome.evaluateHandle(
    (el) => el.shadowRoot
  );
  if (!exampleHomeShadowRoot) {
    throw new Error('Shadow root not found in element-Home');
  }
  // Get the inner HTML of the shadow root
  const btn_query = '#light\\.main_bedroom\\.button';
  const btn_txt_query = `${btn_query} #light\\.main_bedroom\\.text tspan`;
  const okButton = await exampleHomeShadowRoot.evaluate(
    (root, selector_query) => {
      const btn_txt = root?.querySelector(selector_query) as HTMLElement;

      console.log('btn_txt', btn_txt.innerHTML);

      if (btn_txt?.innerHTML) return btn_txt.innerHTML;
      return '';
    },
    btn_txt_query // Pass btn_txt_query as an argument to the evaluate function
  );

  if (!okButton || okButton !== 'ON') throw new Error('Button text is not ON');

  // Now click the button
  await exampleHomeShadowRoot.evaluateHandle((root, selector_query) => {
    const btn = root?.querySelector(selector_query) as HTMLElement;

    if (btn) {
      btn.dispatchEvent(new Event('click'));
      return btn;
    }
    return null;
  }, btn_query);

  const buttonOff = await retry(
    async () => {
      const newTestElRoot = await exampleHome.evaluateHandle(
        (el) => el.shadowRoot
      );
      if (!newTestElRoot) {
        throw new Error('Shadow root not found in element-Home');
      }

      const btn_txt = await newTestElRoot.evaluate((root, selector_query) => {
        const btn_txt = root?.querySelector(selector_query) as HTMLElement;
        if (btn_txt.innerHTML) return btn_txt.innerHTML;
        return '';
      }, btn_txt_query);

      if (btn_txt !== 'OFF') {
        expect(btn_txt).toBe('OFF');
        return await page.waitForTimeout(500);
      } else {
        return true;
      }
    },
    5,
    1000
  );

  expect(buttonOff).toBe(true);
});
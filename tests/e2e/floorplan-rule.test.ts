import { test, expect } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import { retry } from '../jest/jest-common-utils';

let devServer: ChildProcess; // Explicitly type devServer as ChildProcess

// Extend Playwright's default timeout to 120 seconds
test.setTimeout(120000);

// Serve our examples suite
test.beforeAll('Setup webpack dev server with examples', async () => {
  devServer = spawn('npx', ['webpack', 'serve', '--mode=production'], {
    stdio: 'pipe',
    shell: false,
    detached: true, // Run in its own process group
  });

  // Wait for the server to start
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(
        new Error('webpack-dev-server did not start within the expected time.')
      );
    }, 30000); // 30 seconds timeout

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
}); 

test.afterAll(async () => {
  if (devServer) {
    console.log(`Attempting to shut down webpack-dev-server (PID: ${devServer.pid})...`);
    try {
      if (devServer.pid === undefined) {
        console.warn('webpack-dev-server PID is undefined. Skipping termination.');
        return;
      }

      // Check if the process is still running
      try {
        process.kill(devServer.pid, 0); // Signal 0 does not kill the process but checks if it exists
      } catch (err) {
        if ((err as NodeJS.ErrnoException)?.code === 'ESRCH') {
          console.warn(
            'webpack-dev-server process does not exist. Skipping termination.'
          );
          return;
        }
        throw err; // Re-throw unexpected errors
      }

      // Send SIGTERM to the entire process group
      process.kill(-devServer.pid, 'SIGTERM');

      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.error('webpack-dev-server did not shut down in time. Attempting SIGKILL...');
          try {
            if (devServer.pid !== undefined) process.kill(-devServer.pid, 'SIGKILL'); // Forcefully kill the process group
          } catch (err) {
            if ((err as NodeJS.ErrnoException)?.code === 'ESRCH') {
              console.warn('Process group already terminated.');
            } else {
              console.error('Error while forcefully killing process group:', err);
            }
          }
          resolve(false); // Indicate that the shutdown was not graceful
        }, 10000); // 10 seconds timeout

        devServer.on('close', (code) => {
          clearTimeout(timeout);
          console.log(`webpack-dev-server shut down successfully with exit code ${code}.`);
          resolve(true); // Indicate that the shutdown was successful
        });

        devServer.on('error', (error) => {
          clearTimeout(timeout);
          console.error('Error while shutting down webpack-dev-server:', error);
          resolve(false); // Indicate that an error occurred during shutdown
        });
      });

      // Ensure the process is terminated
      if (!devServer.killed) {
        console.warn('webpack-dev-server process is still running. Forcefully killing...');
        try {
          process.kill(-devServer.pid, 'SIGKILL');
        } catch (err) {
          if ((err as NodeJS.ErrnoException)?.code === 'ESRCH') {
            console.warn('Process group already terminated.');
          } else {
            console.error('Error while forcefully killing process group:', err);
          }
        }
      }
    } catch (error) {
      console.error('Failed to terminate webpack-dev-server:', error);
    }
  }
});

test('Rules: Query Elements Methods | Evaluate and build-in playwright query', async ({ page }) => {
  // Capture console logs from the page
  page.on('console', (msg) => {
    console.log(`[FLOORPLAN PAGE LOG] ${msg.type()}: ${msg.text()}`);
  });

  // References
  const pageUrl = 'http://localhost:8080/index-test_plate.html';
  const svgTarget = 'element-TestPlate';
  const btnQueryJSEvaluateSelector = '#radar-toggle-btn';
  const btnTxtQueryJSEvaluateSelector = `#radar-toggle-btn-text tspan`;
  const btnTxtBefore = 'Click to hide radar';
  const btnTxtAfter = 'Good job! Want it back?';

  // Element references for Playwright
  const btnTxtRefStartup =
    'test|floorplan-dataset_set|startup|radar-toggle-btn-text';
  const btnTxtRefDone = 'test|floorplan-execute|done|radar-toggle-btn-text';

  // Navigate to the local dev server
  await page.goto(pageUrl);

  // Wait for btnTxtRefStartup reference to become available. The reference is added as part of startup_action
  const btnTxtContentBefore = page.locator(
    `[data-floorplan-ref="${btnTxtRefStartup}"]`
  );
  await btnTxtContentBefore.waitFor({
    timeout: 10000,
  });

  // Expect the button text to match the expected value
  expect(await btnTxtContentBefore.textContent()).toBe(btnTxtBefore);

  /*
    NOTE: Beginning of native query selector-method
    We'll now use the native evaluate method to get the button text, and then click it.
    This is done, to both have a example of both methods, and if we ever need to rely on native element queries, instead of the helpers provided by Playwright.
  */
  // First we need to get our SVG example element, to have some kind of DOM to work with
  const exampleTestPlate = await page.getByTestId(svgTarget);
  if (!exampleTestPlate) {
    throw new Error('example-TestPlate not found');
  }

  // Access the shadow root
  const exampleTestPlateShadowRoot = await exampleTestPlate.evaluateHandle(
    (el) => el.shadowRoot
  );
  if (!exampleTestPlateShadowRoot) {
    throw new Error('Shadow root not found in element-TestPlate');
  }

  // Get the inner HTML of the shadow root
  const toggleBtn = await exampleTestPlateShadowRoot.evaluate(
    (root, selectorQuery) => {
      const btnTxt = root?.querySelector(selectorQuery) as HTMLElement;

      if (btnTxt?.innerHTML) return btnTxt.innerHTML;
      return '';
    },
    btnTxtQueryJSEvaluateSelector // Pass btnTxtQueryJSEvaluateSelector as an argument to the evaluate function
  );

  if (!toggleBtn || toggleBtn !== btnTxtBefore)
    throw new Error(`Button text is not ${btnTxtBefore}`);

  // Now click the button, with native evaluate
  await exampleTestPlateShadowRoot.evaluateHandle((root, selector_query) => {
    const btn = root?.querySelector(selector_query) as HTMLElement;

    if (btn) {
      btn.dispatchEvent(new Event('click'));
      return btn;
    }
    return null;
  }, btnQueryJSEvaluateSelector);

  // Wait for the button text to change
  const buttonOff = await retry(
    async () => {
      const newTestElRoot = await exampleTestPlate.evaluateHandle(
        (el) => el.shadowRoot
      );
      console.log();
      if (!newTestElRoot) {
        throw new Error('Shadow root not found in element-TestPlate');
      }

      const btnTxt = await newTestElRoot.evaluate((root, selector_query) => {
        const btnTxt = root?.querySelector(selector_query) as HTMLElement;
        if (btnTxt.innerHTML) return btnTxt.innerHTML;
        return '';
      }, btnTxtQueryJSEvaluateSelector);

      if (btnTxt !== btnTxtAfter) {
        expect(btnTxt).toBe(btnTxtAfter);
        return await page.waitForTimeout(500);
      } else {
        return true;
      }
    },
    5,
    1000
  );

  expect(buttonOff).toBe(true);

  /*
    NOTE: End of native query selector-method
  */

  // Use the Playwright method to get the button text
  const btnTxtContentAfter = await page
    .getByTestId(svgTarget)
    .getByTestId(btnTxtRefDone)
    .textContent();

  // Expect the button text to match the expected value
  expect(btnTxtContentAfter).toBe(btnTxtAfter);
});
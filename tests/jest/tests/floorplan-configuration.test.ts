import '@testing-library/jest-dom';
import '../../../src/components/floorplan-examples/floorplan-examples';
import { FloorplanElement } from '../../../src/components/floorplan/floorplan-element';
import {
  createFloorplanExampleElement,
  getFloorplanElement,
  getFloorplanSvg,
} from '../jest-floorplan-utils';
import { retry } from '../jest-common-utils';
import { jest } from '@jest/globals';

describe('Configuration', () => {
  beforeEach(() => {
  });

  afterEach(() => {
    // Remove the floorplan-example element from the DOM
    const element = document.querySelector('floorplan-example');
    if (element) element.remove();
  });

  it('Will initiate ha-floorplan if no rules and stylesheet', async () => {
    const simulated_entity = 'sensor.temperature_living_area';
    const target_svg_element_id = 'radar-toggle-btn-text';

    createFloorplanExampleElement(
      {
        name: 'TestPlate',
        dir: 'test_plate',
        configYaml: `title: TestPlate
config:
  image: /local/floorplan/examples/test_plate/test_plate.svg
        `,
        simulationFile: 'simulations.yaml',
        isCard: true,
      },
      'examples',
      true,
      () => {}
    );

    // Use the utility function to get the floorplan element
    const floorplan_element = await getFloorplanElement();
    expect(floorplan_element).toBeInstanceOf(FloorplanElement);

    // Get the svg
    const svg = await getFloorplanSvg();
    expect(svg).toBeInstanceOf(SVGElement);

    // Validate that our entity is part of the states
    expect(floorplan_element?.hass?.states?.[simulated_entity]).toBeDefined();

    // Now we expect that the text has changed
    await retry(
      async () => {
        const target_el = svg.querySelector(
          `#${target_svg_element_id}`
        ) as SVGElement;

        // Expect the innerHTML to match the text
        expect(target_el.innerHTML).toMatch('Click to hide radar');
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });

  it('Will not initiate ha-floorplan if no image', async () => {
    // Spy on console.error and save the logs
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation((message, ...optionalParams) => {
        // Save the logs to an array for later assertions
        capturedLogs.push({ message, optionalParams });
      });

    // Array to store captured logs
    const capturedLogs: { message: any; optionalParams: any[] }[] = [];

    createFloorplanExampleElement(
      {
        name: 'TestPlate',
        dir: 'test_plate',
        configYaml: `title: TestPlate
config:
  stylesheet: /local/floorplan/examples/test_plate/test_plate.css
      `,
        simulationFile: 'simulations.yaml',
        isCard: true,
      },
      'examples',
      true,
      () => {}
    );

    // Use the utility function to get the floorplan element
    const floorplan_element = await getFloorplanElement();
    expect(floorplan_element).toBeInstanceOf(FloorplanElement);

    // Get the svg
    await expect(async () => {
      await getFloorplanSvg();
    }).rejects.toThrow('SVG element not found inside floorplan-element');

    return await retry(
      async () => {
        // Check if console.log was called
        expect(consoleErrorSpy).toHaveBeenCalled();

        // Restore the original console.log implementation
        consoleErrorSpy.mockRestore();

        // Expect captured logs to contain a "no image provided" message
        expect(
          capturedLogs.some((log) => log.message.includes('No image provided'))
        ).toBe(true);
      },
      10, 
      700
    );
  });

  it.todo('Test image.sizes');
  it.todo('Test image_mobile');
  it.todo('Test log_level');
  it.todo('Test console_log_level');
  it.todo('Test defaults');
});
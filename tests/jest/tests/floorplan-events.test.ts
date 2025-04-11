import '@testing-library/jest-dom';
import '../../../src/components/floorplan-examples/floorplan-examples';
import { FloorplanElement } from '../../../src/components/floorplan/floorplan-element';
import {
  createFloorplanExampleElement,
  getFloorplanElement,
  getFloorplanSvg,
} from '../jest-floorplan-utils';
import { retry } from '../jest-common-utils';
import { dispatchFloorplanActionCallEvent } from '../../../src/components/floorplan/lib/events';

describe('Events', () => {
  beforeEach(() => {
  });

  afterEach(() => {
    // Remove the floorplan-example element from the DOM
    const element = document.querySelector('floorplan-example');
    if (element) element.remove();
  });

  it('Trigger Service Call', async () => {
    const simulatedEntity = 'sensor.temperature_living_area';
    const targetSvgElementId = 'radar-toggle-btn-text';
    const textToSet = "Hello there";

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
    const floorplanElementInstance = await getFloorplanElement();
    expect(floorplanElementInstance).toBeInstanceOf(FloorplanElement);

    // Get the svg
    const svg = await getFloorplanSvg();
    expect(svg).toBeInstanceOf(SVGElement);

    // Validate that our entity is part of the states
    expect(floorplanElementInstance?.hass?.states?.[simulatedEntity]).toBeDefined();

    // Now we expect that the text has changed
    await retry(
      async () => {
        const element = svg.querySelector(
          `#${targetSvgElementId}`
        ) as SVGElement;

        expect(element).toBeInstanceOf(SVGElement);

        // Try and fire custom element
        dispatchFloorplanActionCallEvent(element, {
          actionConfig: [
            {
              action: 'call-service',
              service: 'floorplan.text_set',
              service_data: {
                element: targetSvgElementId,
                text: textToSet,
              },
            },
          ],
          entityId: simulatedEntity,
          /* text_set can handle a situation without svgElementInfo, but it's added for good measure */
          svgElementInfo:
            floorplanElementInstance.entityInfos?.[simulatedEntity]?.ruleInfos[0]
              ?.svgElementInfos[targetSvgElementId],
          ruleInfo:
            floorplanElementInstance.entityInfos?.[simulatedEntity]?.ruleInfos,
        });

        const targetEl = svg.querySelector(
          `#${targetSvgElementId}`
        ) as SVGElement;

        // Expect the innerHTML to match the text
        expect(targetEl.innerHTML).toMatch(textToSet);
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });
});
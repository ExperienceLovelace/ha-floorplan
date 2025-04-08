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
    const simulated_entity = 'sensor.temperature_living_area';
    const target_svg_element_id = 'radar-toggle-btn-text';
    const text_to_set = "Hello there";

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
        const element = svg.querySelector(
          `#${target_svg_element_id}`
        ) as SVGElement;

        expect(element).toBeInstanceOf(SVGElement);

        // Try and fire custom element
        dispatchFloorplanActionCallEvent(element, {
          actionConfig: [
            {
              action: 'call-service',
              service: 'floorplan.text_set',
              service_data: {
                element: target_svg_element_id,
                text: text_to_set,
              },
            },
          ],
          entityId: simulated_entity,
          /* text_set can handle a situation without svgElementInfo, but it's added for good measure */
          svgElementInfo:
            floorplan_element.entityInfos?.[simulated_entity]?.ruleInfos[0]
              ?.svgElementInfos[target_svg_element_id],
          ruleInfo:
            floorplan_element.entityInfos?.[simulated_entity]?.ruleInfos,
        });

        const target_el = svg.querySelector(
          `#${target_svg_element_id}`
        ) as SVGElement;

        // Expect the innerHTML to match the text
        expect(target_el.innerHTML).toMatch(text_to_set);
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });
});
import '@testing-library/jest-dom';
import '../../../src/components/floorplan-examples/floorplan-examples';
import { FloorplanElement } from '../../../src/components/floorplan/floorplan-element';
import {
  createFloorplanExampleElement,
  getFloorplanElement,
  getFloorplanSvg,
} from '../jest-floorplan-utils';
import {SVGElementWithStyle} from '../../types/svg';
import { retry } from '../jest-common-utils';

describe('Services: text_set', () => {
  beforeEach(() => {
  });

  afterEach(() => {
    // Remove the floorplan-example element from the DOM
    const element = document.querySelector('floorplan-example');
    if (element) element.remove();
  });

  it('will render empty string (not null)', async () => {
    const simulatedEntity = 'sensor.empty_text';
    const targetSvgElementId = 'entity-2-state';
    const textToEqual = '';
    const textNotAllowed = [0, '0'];

    createFloorplanExampleElement(
      {
        name: 'TestPlate',
        dir: 'test_plate',
        configYaml: `title: TestPlate
config:
  image: /local/floorplan/examples/test_plate/test_plate.svg
  stylesheet: /local/floorplan/examples/test_plate/test_plate.css
  rules:
    - entity: ${simulatedEntity}
      element: ${targetSvgElementId}
      state_action:
        action: call-service
        service: floorplan.text_set
        service_data: '\${entity.state}' # Adding anything to the state text, will not generate the right result
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

    await retry(
      async () => {
        const targetEl = svg.querySelector(
          `#${targetSvgElementId}`
        ) as SVGElementWithStyle;

        expect(targetEl.id).toEqual(targetSvgElementId);

        // Expect the text content to match the expected value
        const textContent = targetEl.textContent;

        // test_set previously had a bug, where it rendered 0, if state was a "empty string" ("") and added like: service_data: '${entity.state}'
        expect(textContent).toBeDefined();

        // Do not expect 0, as the bug is fixed
        expect(textNotAllowed).not.toContain(textContent);
        expect(textContent).toEqual(textToEqual);
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });
});
import '@testing-library/jest-dom';
import '../../../src/components/floorplan-examples/floorplan-examples';
import { FloorplanElement } from '../../../src/components/floorplan/floorplan-element';
import {
  createFloorplanExampleElement,
  getFloorplanElement,
  getFloorplanSvg,
} from '../jest-floorplan-utils';
import {SVGElementWithStyle} from '../../types/svg';
import { sleep, retry } from '../jest-common-utils';

describe('Action Triggers', () => {
  beforeEach(() => {
  });

  afterEach(() => {
    // Remove the floorplan-example element from the DOM
    const element = document.querySelector('floorplan-example');
    if (element) element.remove();
  });

  it('startup_action', async () => {
    const targetSvgElementId = 'temp-icons';
    const classToAdd = 'temp-ok';

    createFloorplanExampleElement(
      {
        name: 'TestPlate',
        dir: 'test_plate',
        configYaml: `title: TestPlate
config:
  image: /local/floorplan/examples/test_plate/test_plate.svg
  startup_action:
    - action: call-service
      service: floorplan.class_set
      service_data:
        element: '${targetSvgElementId}'
        class: '${classToAdd}'
        `,
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

    // First we need to check if the class does show up, that's possibly by simply query by the class
    await retry(
      async () => {
        const targetEl = svg.querySelector(
          `#${targetSvgElementId}`
        ) as SVGElement;

        // Check if one of the classes is part of the target_classes
        expect(targetEl.classList.contains(classToAdd)).toBeTruthy()
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });

  it('tap_action', async () => {
    const simulatedEntity = 'sensor.temperature_living_area';
    const targetSvgElementId = 'entity-1-state';
    const textToMatch = ' °C';

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
      tap_action:
        action: call-service
        service: floorplan.text_set
        service_data: '\${entity.state} °C'
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

        expect(targetEl.textContent).toEqual('Entity State 1');
        
        // Simulate a click on the target element, to trigger tap_action
        targetEl.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      },
      10,
      700 // This should not match the emulator time sequence
    );

    await retry(
      async () => {
        const targetEl = svg.querySelector(
          `#${targetSvgElementId}`
        ) as SVGElementWithStyle;

        expect(targetEl.id).toEqual(targetSvgElementId);

        // Expect the text content to match the expected value
        const textContent = targetEl.textContent;
        expect(textContent).toBeDefined();
        expect(textContent).toContain(textToMatch);
        // The value should be included, but string-typed
        expect(textContent).toContain(
          '' + floorplanElementInstance?.hass?.states?.[simulatedEntity].state
        );
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });

  it('hold_action', async () => {
    const simulatedEntity = 'sensor.temperature_living_area';
    const targetSvgElementId = 'entity-1-state';
    const textToMatch = ' °C';

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
      hold_action:
        action: call-service
        service: floorplan.text_set
        service_data: '\${entity.state} °C'
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
        expect(
          (
            svg.querySelector(
              `#${targetSvgElementId}`
            ) as SVGElementWithStyle
          ).textContent
        ).toEqual('Entity State 1');
      },
      10,
      700
    );

    const targetEl = svg.querySelector(
      `#${targetSvgElementId}`
    ) as SVGElementWithStyle;
    // Simulate a hold action on the target element
    targetEl.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    );

    await sleep(500); // Simulate the hold duration, minimum 400

    targetEl.dispatchEvent(
      new MouseEvent('mouseup', { bubbles: true, cancelable: true })
    );

    await retry(
      async () => {
        const targetEl = svg.querySelector(
          `#${targetSvgElementId}`
        ) as SVGElementWithStyle;

        expect(targetEl.id).toEqual(targetSvgElementId);

        // Expect the text content to match the expected value
        const textContent = targetEl.textContent;
        expect(textContent).toBeDefined();
        expect(textContent).toContain(textToMatch);
        // The value should be included, but string-typed
        expect(textContent).toContain(
          '' + floorplanElementInstance?.hass?.states?.[simulatedEntity].state
        );
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });

  it('double_tap_action', async () => {
    const simulatedEntity = 'sensor.temperature_living_area';
    const targetSvgElementId = 'entity-1-state';
    const textToMatch = ' °C';

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
      double_tap_action:
        action: call-service
        service: floorplan.text_set
        service_data: '\${entity.state} °C'
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
        expect((svg.querySelector(
          `#${targetSvgElementId}`
        ) as SVGElementWithStyle).textContent).toEqual('Entity State 1');
      },
      10,
      700
    );

    const targetEl = svg.querySelector(
      `#${targetSvgElementId}`
    ) as SVGElementWithStyle;

    // Simulate a double click on the target element
    targetEl.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true })
    );

    await sleep(100); // Ensure the delay is less than the threshold for double click

    targetEl.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true })
    );

    await retry(
      async () => {
        const targetEl = svg.querySelector(
          `#${targetSvgElementId}`
        ) as SVGElementWithStyle;

        expect(targetEl.id).toEqual(targetSvgElementId);

        // Expect the text content to match the expected value
        const textContent = targetEl.textContent;
        expect(textContent).toBeDefined();
        expect(textContent).toContain(textToMatch);
        // The value should be included, but string-typed
        expect(textContent).toContain(
          '' + floorplanElementInstance?.hass?.states?.[simulatedEntity].state
        );
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });

  it('state_action', async () => {
    const simulatedEntity = 'sensor.temperature_living_area';
    const targetSvgElementId = 'entity-1-state';
    const textToMatch = ' °C';

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
        service_data: '\${entity.state} °C'
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
        expect(textContent).toBeDefined();
        expect(textContent).toContain(textToMatch);
        // The value should be included, but string-typed
        expect(textContent).toContain(
          '' + floorplanElementInstance?.hass?.states?.[simulatedEntity].state
        );
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });

  it('hover_action', async () => {
    const simulatedEntity = 'sensor.temperature_living_area';
    // "g" elements can have a hover-event by default. We manipulate text and other elements, to work with hover, by adding a title
    const targetSvgElementId = 'group-row-1'; // That's a <g> element
    const classToAdd = 'mouse_hover_works';

    createFloorplanExampleElement(
      {
        name: 'TestPlate',
        dir: 'test_plate',
        configYaml: `title: TestPlate
config:
  image: /local/floorplan/examples/test_plate/test_plate.svg
  stylesheet: /local/floorplan/examples/test_plate/test_plate.css
  rules:
    - entity: '${simulatedEntity}'
      element: '${targetSvgElementId}'
      hover_action:
        - service: floorplan.class_set
          service_data: '${classToAdd}'
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

    await retry(
      async () => {
        expect(
          svg.querySelector(`#${targetSvgElementId}`) as SVGElementWithStyle
        ).toBeDefined();
      },
      10,
      700
    );

    const targetEl = svg.querySelector(
      `#${targetSvgElementId}`
    ) as SVGElementWithStyle;

    // Simulate a hover action on the target element
    targetEl.dispatchEvent(
      new MouseEvent('mouseenter', { bubbles: true, cancelable: true })
    );

    // Wait for the event to propagate
    await sleep(300);

    // Simulate the mouseout action
    targetEl.dispatchEvent(
      new MouseEvent('mouseout', { bubbles: true, cancelable: true })
    );

    await retry(
      async () => {
        const targetEl = svg.querySelector(
          `#${targetSvgElementId}`
        ) as SVGElementWithStyle;

        expect(targetEl.id).toEqual(targetSvgElementId);
        expect(targetEl.classList.contains(classToAdd)).toBeTruthy();
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });
});
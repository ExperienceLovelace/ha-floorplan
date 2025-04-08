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
    const simulated_entity = 'sensor.temperature_living_area';
    const target_svg_element_id = 'temp-icons';
    const class_to_add = 'temp-ok';

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
        element: '${target_svg_element_id}'
        class: '${class_to_add}'
        `,
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

    // First we need to check if the class does show up, that's possibly by simply query by the class
    await retry(
      async () => {
        const target_el = svg.querySelector(
          `#${target_svg_element_id}`
        ) as SVGElement;

        // Check if one of the classes is part of the target_classes
        expect(target_el.classList.contains(class_to_add)).toBeTruthy()
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });

  it('tap_action', async () => {
    const simulated_entity = 'sensor.temperature_living_area';
    const target_svg_element_id = 'entity-1-state';
    const text_to_match = ' °C';

    createFloorplanExampleElement(
      {
        name: 'TestPlate',
        dir: 'test_plate',
        configYaml: `title: TestPlate
config:
  image: /local/floorplan/examples/test_plate/test_plate.svg
  stylesheet: /local/floorplan/examples/test_plate/test_plate.css
  rules:
    - entity: ${simulated_entity}
      element: ${target_svg_element_id}
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
    const floorplan_element = await getFloorplanElement();
    expect(floorplan_element).toBeInstanceOf(FloorplanElement);

    // Get the svg
    const svg = await getFloorplanSvg();
    expect(svg).toBeInstanceOf(SVGElement);

    // Validate that our entity is part of the states
    expect(floorplan_element?.hass?.states?.[simulated_entity]).toBeDefined();

    await retry(
      async () => {
        const target_el = svg.querySelector(
          `#${target_svg_element_id}`
        ) as SVGElementWithStyle;

        expect(target_el.textContent).toEqual('Entity State 1');
        
        // Simulate a click on the target element, to trigger tap_action
        target_el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      },
      10,
      700 // This should not match the emulator time sequence
    );

    await retry(
      async () => {
        const target_el = svg.querySelector(
          `#${target_svg_element_id}`
        ) as SVGElementWithStyle;

        expect(target_el.id).toEqual(target_svg_element_id);

        // Expect the text content to match the expected value
        const text_content = target_el.textContent;
        expect(text_content).toBeDefined();
        expect(text_content).toContain(text_to_match);
        // The value should be included, but string-typed
        expect(text_content).toContain(
          '' + floorplan_element?.hass?.states?.[simulated_entity].state
        );
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });

  it('hold_action', async () => {
    const simulated_entity = 'sensor.temperature_living_area';
    const target_svg_element_id = 'entity-1-state';
    const text_to_match = ' °C';

    createFloorplanExampleElement(
      {
        name: 'TestPlate',
        dir: 'test_plate',
        configYaml: `title: TestPlate
config:
  image: /local/floorplan/examples/test_plate/test_plate.svg
  stylesheet: /local/floorplan/examples/test_plate/test_plate.css
  rules:
    - entity: ${simulated_entity}
      element: ${target_svg_element_id}
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
    const floorplan_element = await getFloorplanElement();
    expect(floorplan_element).toBeInstanceOf(FloorplanElement);

    // Get the svg
    const svg = await getFloorplanSvg();
    expect(svg).toBeInstanceOf(SVGElement);

    // Validate that our entity is part of the states
    expect(floorplan_element?.hass?.states?.[simulated_entity]).toBeDefined();

    await retry(
      async () => {
        expect(
          (
            svg.querySelector(
              `#${target_svg_element_id}`
            ) as SVGElementWithStyle
          ).textContent
        ).toEqual('Entity State 1');
      },
      10,
      700
    );

    const target_el = svg.querySelector(
      `#${target_svg_element_id}`
    ) as SVGElementWithStyle;
    // Simulate a hold action on the target element
    target_el.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    );

    await sleep(500); // Simulate the hold duration, minimum 400

    target_el.dispatchEvent(
      new MouseEvent('mouseup', { bubbles: true, cancelable: true })
    );

    await retry(
      async () => {
        const target_el = svg.querySelector(
          `#${target_svg_element_id}`
        ) as SVGElementWithStyle;

        expect(target_el.id).toEqual(target_svg_element_id);

        // Expect the text content to match the expected value
        const text_content = target_el.textContent;
        expect(text_content).toBeDefined();
        expect(text_content).toContain(text_to_match);
        // The value should be included, but string-typed
        expect(text_content).toContain(
          '' + floorplan_element?.hass?.states?.[simulated_entity].state
        );
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });

  it('double_tap_action', async () => {
    const simulated_entity = 'sensor.temperature_living_area';
    const target_svg_element_id = 'entity-1-state';
    const text_to_match = ' °C';

    createFloorplanExampleElement(
      {
        name: 'TestPlate',
        dir: 'test_plate',
        configYaml: `title: TestPlate
config:
  image: /local/floorplan/examples/test_plate/test_plate.svg
  stylesheet: /local/floorplan/examples/test_plate/test_plate.css
  rules:
    - entity: ${simulated_entity}
      element: ${target_svg_element_id}
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
    const floorplan_element = await getFloorplanElement();
    expect(floorplan_element).toBeInstanceOf(FloorplanElement);

    // Get the svg
    const svg = await getFloorplanSvg();
    expect(svg).toBeInstanceOf(SVGElement);

    // Validate that our entity is part of the states
    expect(floorplan_element?.hass?.states?.[simulated_entity]).toBeDefined();

    await retry(
      async () => {
        expect((svg.querySelector(
          `#${target_svg_element_id}`
        ) as SVGElementWithStyle).textContent).toEqual('Entity State 1');
      },
      10,
      700
    );

    const target_el = svg.querySelector(
      `#${target_svg_element_id}`
    ) as SVGElementWithStyle;

    // Simulate a double click on the target element
    target_el.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true })
    );

    await sleep(100); // Ensure the delay is less than the threshold for double click

    target_el.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true })
    );

    await retry(
      async () => {
        const target_el = svg.querySelector(
          `#${target_svg_element_id}`
        ) as SVGElementWithStyle;

        expect(target_el.id).toEqual(target_svg_element_id);

        // Expect the text content to match the expected value
        const text_content = target_el.textContent;
        expect(text_content).toBeDefined();
        expect(text_content).toContain(text_to_match);
        // The value should be included, but string-typed
        expect(text_content).toContain(
          '' + floorplan_element?.hass?.states?.[simulated_entity].state
        );
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });

  it('state_action', async () => {
    const simulated_entity = 'sensor.temperature_living_area';
    const target_svg_element_id = 'entity-1-state';
    const text_to_match = ' °C';

    createFloorplanExampleElement(
      {
        name: 'TestPlate',
        dir: 'test_plate',
        configYaml: `title: TestPlate
config:
  image: /local/floorplan/examples/test_plate/test_plate.svg
  stylesheet: /local/floorplan/examples/test_plate/test_plate.css
  rules:
    - entity: ${simulated_entity}
      element: ${target_svg_element_id}
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
    const floorplan_element = await getFloorplanElement();
    expect(floorplan_element).toBeInstanceOf(FloorplanElement);

    // Get the svg
    const svg = await getFloorplanSvg();
    expect(svg).toBeInstanceOf(SVGElement);

    // Validate that our entity is part of the states
    expect(floorplan_element?.hass?.states?.[simulated_entity]).toBeDefined();

    await retry(
      async () => {
        const target_el = svg.querySelector(
          `#${target_svg_element_id}`
        ) as SVGElementWithStyle;

        expect(target_el.id).toEqual(target_svg_element_id);

        // Expect the text content to match the expected value
        const text_content = target_el.textContent;
        expect(text_content).toBeDefined();
        expect(text_content).toContain(text_to_match);
        // The value should be included, but string-typed
        expect(text_content).toContain(
          '' + floorplan_element?.hass?.states?.[simulated_entity].state
        );
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });

  it('hover_action', async () => {
    const simulated_entity = 'sensor.temperature_living_area';
    // "g" elements can have a hover-event by default. We manipulate text and other elements, to work with hover, by adding a title
    const target_svg_element_id = 'group-row-1'; // That's a <g> element
    const class_to_add = 'mouse_hover_works';

    createFloorplanExampleElement(
      {
        name: 'TestPlate',
        dir: 'test_plate',
        configYaml: `title: TestPlate
config:
  image: /local/floorplan/examples/test_plate/test_plate.svg
  stylesheet: /local/floorplan/examples/test_plate/test_plate.css
  rules:
    - entity: '${simulated_entity}'
      element: '${target_svg_element_id}'
      hover_action:
        - service: floorplan.class_set
          service_data: '${class_to_add}'
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

    await retry(
      async () => {
        expect(
          svg.querySelector(`#${target_svg_element_id}`) as SVGElementWithStyle
        ).toBeDefined();
      },
      10,
      700
    );

    const target_el = svg.querySelector(
      `#${target_svg_element_id}`
    ) as SVGElementWithStyle;

    // Simulate a hover action on the target element
    target_el.dispatchEvent(
      new MouseEvent('mouseenter', { bubbles: true, cancelable: true })
    );

    // Wait for the event to propagate
    await sleep(300);

    // Simulate the mouseout action
    target_el.dispatchEvent(
      new MouseEvent('mouseout', { bubbles: true, cancelable: true })
    );

    await retry(
      async () => {
        const target_el = svg.querySelector(
          `#${target_svg_element_id}`
        ) as SVGElementWithStyle;

        expect(target_el.id).toEqual(target_svg_element_id);
        expect(target_el.classList.contains(class_to_add)).toBeTruthy();
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });
});
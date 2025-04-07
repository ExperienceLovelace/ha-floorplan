/**
 * @jest-environment-options {"url": "http://localhost:8080"}
 */

import '@testing-library/jest-dom';
import '../../../src/components/floorplan-examples/floorplan-examples';
import { FloorplanExampleElement } from '../../../src/components/floorplan-examples/floorplan-example';
import {
  HassSimulator,
  SimulationProcessor,
} from '../../../src/components/floorplan-examples/hass-simulator';
import { FloorplanElement } from '../../../src/components/floorplan/floorplan-element';
import { FloorplanCallServiceActionConfig } from '../../../src/components/floorplan/lib/floorplan-config';
import {
  createFloorplanExampleElement,
  getFloorplanElement,
  getFloorplanSvg,
  getFloorplanExampleElement,
} from '../jest-floorplan-utils';
import {SVGElementWithStyle} from '../../types/svg';
import { sleep, retry } from '../jest-common-utils';

describe('Services', () => {
  beforeEach(() => {
  });

  afterEach(() => {
    // Remove the floorplan-example element from the DOM
    const element = document.querySelector('floorplan-example');
    if (element) element.remove();
  });

  it('floorplan.class_toggle', async () => {
    const simulated_entity = 'binary_sensor.radar_bg';
    const target_svg_element_id = 'radar-bg';
    const class_to_toggle = 'radar-bg-opacity-dimmed';

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
        - action: call-service
          service: floorplan.class_toggle
          service_data:
            class: '${class_to_toggle}'

        - action: call-service
          service: floorplan.execute
          service_data:
            script_custom_name_goes_here: |
             >
             elements['${target_svg_element_id}'].dataset.floorplanRef = 'test|floorplan-execute|triggered|radar-bg'; /* Ignore this line, added for testing */
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

    // First we need to check if the class does show up, that's possibly by simply query by the class
    await retry(
      async () => {
        const target_el = svg.querySelector(
          `#${target_svg_element_id}`
        ) as SVGElement;

        // By querying by the toggling class, we're sure it's added to the element
        const target_el_by_class = svg.querySelector(
          `.${class_to_toggle}`
        ) as SVGElement;

        expect(target_el.id).toEqual(target_svg_element_id);
        expect(target_el.id).toEqual(target_el_by_class.id);
      },
      10,
      700 // This should not match the emulator time sequence
    );

    // Now we need to check if the class is removed when the entity is off
    await retry(
      async () => {
        const target_el = svg.querySelector(
          `#${target_svg_element_id}`
        ) as SVGElement;

        // Confirm that the state is off
        // This is needed, as the emulator does toggle things on and off
        expect(
          floorplan_element?.hass?.states?.[simulated_entity].state
        ).toEqual('off');

        // Now we don't expect the toggled class to be part of target_classes
        const target_classes = target_el.classList;
        expect(target_classes.contains(class_to_toggle)).toBeFalsy();
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });

  it('floorplan.class_set', async () => {
    const simulated_entity = 'sensor.temperature_living_area';
    const target_svg_element_id = 'temp-icons'
    const classes_expected = {
      'warning': 'temp-warning',
      'cold': 'temp-cold',
      'ok': 'temp-ok',
    };

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
        service: floorplan.class_set
        service_data:
          class: |
            >
            if(entity.state > 25) {
              return '${classes_expected.warning}';
            } else if(entity.state < 15) {
              return '${classes_expected.cold}';
            } else {
              return '${classes_expected.ok}';
            }
      tap_action: false
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

    // First we need to check if the class does show up, that's possibly by simply query by the class
    await retry(
      async () => {
        const target_el = svg.querySelector(
          `#${target_svg_element_id}`
        ) as SVGElement;

        // Check if one of the classes is part of the target_classes
        const contains_class = Object.values(classes_expected).some((class_name) => target_el.classList.contains(class_name));
        expect(contains_class).toBeTruthy();
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });

  it('floorplan.dataset_set', async () => {
    const simulated_entity = 'sensor.warning_level';
    const target_svg_element_id = 'rect-gradient-bg';
    const custom_key = 'custom_attribute_val';

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
        - action: call-service
          service: floorplan.dataset_set
          service_data:
              key: ${custom_key}
              value: \${entity.attributes.level}
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

    // Get the element by looking after the dataset, and compare value with state
    await retry(
      async () => {
        const target_el = svg.querySelector(
          `[data-${custom_key}]`
        ) as SVGElement;

        expect(target_el.id).toEqual(target_svg_element_id);
        expect(target_el.dataset).toHaveProperty(custom_key);

        // Expect the dataset to be equal to the entity state, but string-typed
        expect(target_el.dataset[custom_key]).toEqual(""+floorplan_element?.hass?.states?.[simulated_entity].attributes.level);
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });

  it('floorplan.style_set', async () => {
    const simulated_entity = 'light.living_area';
    const target_svg_element_id = 'lamp-icon';
    const colors = ['#eecb04', '#8e8e8e'];

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
        - action: call-service
          service: floorplan.style_set
          service_data: 
            style: |
              >
              const color = entity.state === 'on' ? '${colors[0]}' : '${colors[1]}';
              const opacity = entity.state === 'on' ? 1 : 0.7;

              return \`
                fill: \${color};
                opacity: \${opacity};
              \`
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

    // Get the element by looking after the dataset, and compare value with state
    await retry(
      async () => {
        const target_el = svg.querySelector(
          `#${target_svg_element_id}`
        ) as SVGElementWithStyle;

        expect(target_el.id).toEqual(target_svg_element_id);
        
        // Expect one of the fills to match the expected colors
        const fill = target_el.style.fill;
        expect(fill).toBeDefined();
        expect(colors).toContain(fill);
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });  

  it('floorplan.text_set', async () => {
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

    // Get the element by looking after the dataset, and compare value with state
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
        expect(text_content).toContain(""+floorplan_element?.hass?.states?.[simulated_entity].state);
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });

  it('floorplan.image_set', async () => {
    const simulated_entity = 'light.living_area';
    const target_svg_element_id = 'svg-icon-target';

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
        - action: call-service
          service: floorplan.image_set
          service_data:
            image: |
              >
              return '/local/floorplan/examples/test_plate/light_'+entity.state+'.svg';
            cache: true
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

    // Get the element by looking after the dataset, and compare value with state
    await retry(
      async () => {
        const target_el = svg.querySelector(
          `#${target_svg_element_id}`
        ) as SVGElementWithStyle;

        expect(target_el.id).toEqual(target_svg_element_id);

        // This can generate a few HTTP errors, while the web-server are not yet ready
        const expected_file_name = `light_${floorplan_element?.hass?.states?.[simulated_entity].state}.svg`;
        expect(target_el.getAttribute('sodipodi:docname')).toEqual(expected_file_name);
      },
      20,
      700 // This should not match the emulator time sequence
    );
  });  

  it.todo('floorplan.image_set with "image_refresh_interval"');
  it.todo('floorplan.image_set with "cache: false"');

  it('floorplan.execute', async () => {
    const simulated_entity = 'sensor.temperature_living_area';
    const target_svg_element_id = 'radar-toggle-btn-text';

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
        - action: call-service
          service: floorplan.execute
          service_data:
            custom_script_1: |
              >
              // Let's first use text_set, to add a text to the target
              const action_data = {
                action: 'call-service',
                service: 'floorplan.text_set',
                service_data: {
                  element: '${target_svg_element_id}',
                  text: 'Hi',
                }
              };
              action(action_data);

              // We could use "element", but here I'm targeting it
              // Let's now add 'Bob' to the text
              const element_target = elements['${target_svg_element_id}'];
              element_target.innerHTML = element_target.innerHTML + 'Bob';
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

    // We'll check if the text is set
    await retry(
      async () => {
        const target_el = svg.querySelector(
          `#${target_svg_element_id}`
        ) as SVGElement;

        expect(target_el.id).toEqual(target_svg_element_id);

        // Expect the text content to match the expected value
        const text_content = target_el.textContent;
        expect(text_content).toBeDefined();

        expect(text_content).toEqual('HiBob');
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });
});
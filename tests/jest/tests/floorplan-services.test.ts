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

describe('Services', () => {
  beforeEach(() => {
  });

  afterEach(() => {
    // Remove the floorplan-example element from the DOM
    const element = document.querySelector('floorplan-example');
    if (element) element.remove();
  });

  it('floorplan.class_toggle', async () => {
    const simulatedEntity = 'binary_sensor.radar_bg';
    const targetSvgElementId = 'radar-bg';
    const classToToggle = 'radar-bg-opacity-dimmed';

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
        - action: call-service
          service: floorplan.class_toggle
          service_data:
            class: '${classToToggle}'

        - action: call-service
          service: floorplan.execute
          service_data:
            script_custom_name_goes_here: |
             >
             elements['${targetSvgElementId}'].dataset.floorplanRef = 'test|floorplan-execute|triggered|radar-bg'; /* Ignore this line, added for testing */
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

    // First we need to check if the class does show up, that's possibly by simply query by the class
    await retry(
      async () => {
        const targetEl = svg.querySelector(
          `#${targetSvgElementId}`
        ) as SVGElement;

        // By querying by the toggling class, we're sure it's added to the element
        const target_el_by_class = svg.querySelector(
          `.${classToToggle}`
        ) as SVGElement;

        expect(targetEl.id).toEqual(targetSvgElementId);
        expect(targetEl.id).toEqual(target_el_by_class.id);
      },
      10,
      700 // This should not match the emulator time sequence
    );

    // Now we need to check if the class is removed when the entity is off
    await retry(
      async () => {
        const targetEl = svg.querySelector(
          `#${targetSvgElementId}`
        ) as SVGElement;

        // Confirm that the state is off
        // This is needed, as the emulator does toggle things on and off
        expect(
          floorplanElementInstance?.hass?.states?.[simulatedEntity].state
        ).toEqual('off');

        // Now we don't expect the toggled class to be part of target_classes
        const target_classes = targetEl.classList;
        expect(target_classes.contains(classToToggle)).toBeFalsy();
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });

  it('floorplan.class_set', async () => {
    const simulatedEntity = 'sensor.temperature_living_area';
    const targetSvgElementId = 'temp-icons';
    const classesExpected = {
      warning: 'temp-warning',
      cold: 'temp-cold',
      ok: 'temp-ok',
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
    - entity: ${simulatedEntity}
      element: ${targetSvgElementId}
      state_action:
        action: call-service
        service: floorplan.class_set
        service_data:
          class: |
            >
            if(entity.state > 25) {
              return '${classesExpected.warning}';
            } else if(entity.state < 15) {
              return '${classesExpected.cold}';
            } else {
              return '${classesExpected.ok}';
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
    const floorplanElementInstance = await getFloorplanElement();
    expect(floorplanElementInstance).toBeInstanceOf(FloorplanElement);

    // Get the svg
    const svg = await getFloorplanSvg();
    expect(svg).toBeInstanceOf(SVGElement);

    // Validate that our entity is part of the states
    expect(floorplanElementInstance?.hass?.states?.[simulatedEntity]).toBeDefined();

    // First we need to check if the class does show up, that's possibly by simply query by the class
    await retry(
      async () => {
        const targetEl = svg.querySelector(
          `#${targetSvgElementId}`
        ) as SVGElement;

        // Check if one of the classes is part of the target_classes
        const containsClass = Object.values(classesExpected).some((className) => targetEl.classList.contains(className));
        expect(containsClass).toBeTruthy();
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });

  it('floorplan.dataset_set', async () => {
    const simulatedEntity = 'sensor.warning_level';
    const targetSvgElementId = 'rect-gradient-bg';
    const customKey = 'custom_attribute_val';

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
        - action: call-service
          service: floorplan.dataset_set
          service_data:
              key: ${customKey}
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
    const floorplanElementInstance = await getFloorplanElement();
    expect(floorplanElementInstance).toBeInstanceOf(FloorplanElement);

    // Get the svg
    const svg = await getFloorplanSvg();
    expect(svg).toBeInstanceOf(SVGElement);

    // Validate that our entity is part of the states
    expect(floorplanElementInstance?.hass?.states?.[simulatedEntity]).toBeDefined();

    // Get the element by looking after the dataset, and compare value with state
    await retry(
      async () => {
        const targetEl = svg.querySelector(
          `[data-${customKey}]`
        ) as SVGElement;

        expect(targetEl.id).toEqual(targetSvgElementId);
        expect(targetEl.dataset).toHaveProperty(customKey);

        // Expect the dataset to be equal to the entity state, but string-typed
        expect(targetEl.dataset[customKey]).toEqual(""+floorplanElementInstance?.hass?.states?.[simulatedEntity].attributes.level);
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });

  it('floorplan.style_set', async () => {
    const simulatedEntity = 'light.living_area';
    const targetSvgElementId = 'lamp-icon';
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
    - entity: ${simulatedEntity}
      element: ${targetSvgElementId}
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
        
        // Expect one of the fills to match the expected colors
        const fill = targetEl.style.fill;
        expect(fill).toBeDefined();
        expect(colors).toContain(fill);
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });  

  it('floorplan.text_set', async () => {
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
        expect(textContent).toContain(""+floorplanElementInstance?.hass?.states?.[simulatedEntity].state);
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });

  it('floorplan.image_set', async () => {
    const simulatedEntity = 'light.living_area';
    const targetSvgElementId = 'svg-icon-target';

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

        // This can generate a few HTTP errors, while the web-server are not yet ready
        const expected_file_name = `light_${floorplanElementInstance?.hass?.states?.[simulatedEntity].state}.svg`;
        expect(targetEl.getAttribute('sodipodi:docname')).toEqual(expected_file_name);
      },
      20,
      700 // This should not match the emulator time sequence
    );
  });  

  it.todo('floorplan.image_set with "image_refresh_interval"');
  it.todo('floorplan.image_set with "cache: false"');

  it('floorplan.execute', async () => {
    const simulatedEntity = 'sensor.temperature_living_area';
    const targetSvgElementId = 'radar-toggle-btn-text';

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
                  element: '${targetSvgElementId}',
                  text: 'Hi',
                }
              };
              action(action_data);

              // We could use "element", but here I'm targeting it
              // Let's now add 'Bob' to the text
              const element_target = elements['${targetSvgElementId}'];
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
    const floorplanElementInstance = await getFloorplanElement();
    expect(floorplanElementInstance).toBeInstanceOf(FloorplanElement);

    // Get the svg
    const svg = await getFloorplanSvg();
    expect(svg).toBeInstanceOf(SVGElement);

    // Validate that our entity is part of the states
    expect(floorplanElementInstance?.hass?.states?.[simulatedEntity]).toBeDefined();

    // We'll check if the text is set
    await retry(
      async () => {
        const targetEl = svg.querySelector(
          `#${targetSvgElementId}`
        ) as SVGElement;

        expect(targetEl.id).toEqual(targetSvgElementId);

        // Expect the text content to match the expected value
        const textContent = targetEl.textContent;
        expect(textContent).toBeDefined();

        expect(textContent).toEqual('HiBob');
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });
});
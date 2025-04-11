import '@testing-library/jest-dom';
import '../../../src/components/floorplan-examples/floorplan-examples';
import { FloorplanElement } from '../../../src/components/floorplan/floorplan-element';
import {
  createFloorplanExampleElement,
  getFloorplanElement,
  getFloorplanHelper,
  getFloorplanSvg,
  global_document_object_key,
} from '../jest-floorplan-utils';
import { retry } from '../jest-common-utils';

describe('Evaluated JS Helpers: Functions', () => {
  beforeEach(() => {});

  afterEach(() => {
    // Remove the floorplan-example element from the DOM
    const element = document.querySelector('floorplan-example');
    if (element) element.remove();
  });

  it('util > color > miredToRGB: Converts mired (light temperature) to RGB', async () => {
    const miredValue = 80; // Example mired value
    const expectedRgb = [189, 210, 255]; // Expected RGB value for the given mired
    const simulatedEntity = 'sensor.temperature_living_area';
    const targetSvgElementId = 'entity-1-state';

    const helperToTest = 'miredToRGB';

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
            test_script_for_helper: |
              > if(typeof document['${global_document_object_key}'] === 'undefined') document.${global_document_object_key} = {};
               const mired_number = ${miredValue};
              document.${global_document_object_key}['${helperToTest}'] = util.color.miredToRGB(mired_number);
        `,
        simulationFile: 'simulations.yaml',
        isCard: true,
      },
      'examples',
      true,
      () => {}
    );

    await retry(
      async () => {
        const helperRef = await getFloorplanHelper(helperToTest);

        // Check if helper to test exists
        expect(helperRef).toBeDefined();

        // SPECIFIC FOR THIS HELPER:
        // Validate the RGB value
        expect(helperRef).toEqual(expectedRgb);
      },
      10,
      700
    );
  });

  it('util > color > kelvinToRGB: Converts kelvin (light temperature) to RGB', async () => {
    const kelvinValue = 1700; // Example kelvin value
    const expectedRgb = [255, 121, 0]; // Expected RGB value for the given kelvin
    const simulatedEntity = 'sensor.temperature_living_area';
    const targetSvgElementId = 'entity-2-state';

    const helperToTest = 'kelvinToRGB';

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
            test_script_for_helper: |
              > if(typeof document['${global_document_object_key}'] === 'undefined') document.${global_document_object_key} = {};
               const kelvin_number = ${kelvinValue};
              document.${global_document_object_key}['${helperToTest}'] = util.color.kelvinToRGB(kelvin_number);
        `,
        simulationFile: 'simulations.yaml',
        isCard: true,
      },
      'examples',
      true,
      () => {}
    );

    await retry(
      async () => {
        const helperRef = await getFloorplanHelper(helperToTest);

        // Check if helper to test exists
        expect(helperRef).toBeDefined();

        // SPECIFIC FOR THIS HELPER:
        // Validate the RGB value
        expect(helperRef).toEqual(expectedRgb);
      },
      10,
      700
    );
  });

  it('util > date > strftime: Formats date/time according to a format string', async () => {
    const dateStrInput = '2025-07-04 17:00:00';
    const formatString = '%d-%m-%Y %I:%M:%S %p'; // Example format string
    const expectedFormattedDate = '04-07-2025 05:00:00 PM'; // Expected formatted date
    const simulatedEntity = 'sensor.temperature_living_area';
    const targetSvgElementId = 'entity-2-state';

    const helperToTest = 'strftime';

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
            test_script_for_helper: |
              > if(typeof document['${global_document_object_key}'] === 'undefined') document.${global_document_object_key} = {};
               const input_date = new Date('${dateStrInput}');
               const format = '${formatString}';
              document.${global_document_object_key}['${helperToTest}'] = util.date.strftime(format, input_date);
        `,
        simulationFile: 'simulations.yaml',
        isCard: true,
      },
      'examples',
      true,
      () => {}
    );

    await retry(
      async () => {
        const helperRef = await getFloorplanHelper(helperToTest);

        // Check if helper to test exists
        expect(helperRef).toBeDefined();

        // SPECIFIC FOR THIS HELPER:
        // Validate the formatted date
        expect(helperRef).toEqual(expectedFormattedDate);
      },
      2,
      700
    );
  });

  it('util > date > timeago: Converts a date to a human-readable "time ago" format', async () => {
    const pastDate = new Date(Date.now() - 3600 * 1000); // 1 hour ago
    const expectedTimeAgo = '1 hour ago'; // Expected human-readable format
    const simulatedEntity = 'sensor.temperature_living_area';
    const targetSvgElementId = 'entity-2-state';

    const helperToTest = 'timeago';

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
            test_script_for_helper: |
              > if(typeof document['${global_document_object_key}'] === 'undefined') document.${global_document_object_key} = {};
               const date = new Date(${pastDate.getTime()});
              document.${global_document_object_key}['${helperToTest}'] = util.date.timeago(date);
        `,
        simulationFile: 'simulations.yaml',
        isCard: true,
      },
      'examples',
      true,
      () => {}
    );

    await retry(
      async () => {
        const helperRef = await getFloorplanHelper(helperToTest);

        // Check if helper to test exists
        expect(helperRef).toBeDefined();

        // SPECIFIC FOR THIS HELPER:
        // Validate the "time ago" value
        expect(helperRef).toEqual(expectedTimeAgo);
      },
      10,
      700
    );
  });

  it('action: Execute services', async () => {
    const simulatedEntity = 'sensor.temperature_living_area';
    const targetSvgElementId = 'radar-toggle-btn-text';
    const text_to_set = 'Hi from inline-js action fnc fired by floorplan.class_set';

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
          service: floorplan.class_set
          service_data:
            custom_script_1: |
              >
              // Let's first use text_set, to add a text to the target
              const action_data = {
                action: 'call-service',
                service: 'floorplan.text_set',
                service_data: {
                  element: '${targetSvgElementId}',
                  text: '${text_to_set}',
                }
              };
              action(action_data);
              // Return a class
              return 'test-class-not-used'
        `,
        simulationFile: 'simulations.yaml',
        isCard: true,
      },
      'examples',
      true,
      () => {}
    );

    // Get the svg
    const svg = await getFloorplanSvg();
    expect(svg).toBeInstanceOf(SVGElement);

    // We'll check if the text is set
    await retry(
      async () => {
        const targetElement = svg.querySelector(
          `#${targetSvgElementId}`
        ) as SVGElement;

        expect(targetElement.id).toEqual(targetSvgElementId);

        // Expect the text content to match the expected value
        const textContent = targetElement.textContent;
        expect(textContent).toBeDefined();

        expect(textContent).toEqual(text_to_set);
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });

  it('functions > function without arguments', async () => {
    const simulatedEntity = 'sensor.temperature_living_area';
    const targetSvgElementId = 'radar-toggle-btn-text';
    const text_to_expect = 'Hej med dig';

    createFloorplanExampleElement(
      {
        name: 'TestPlate',
        dir: 'test_plate',
        configYaml: `title: TestPlate
config:
  image: /local/floorplan/examples/test_plate/test_plate.svg
  stylesheet: /local/floorplan/examples/test_plate/test_plate.css
  functions: |
    >
    return {
      say_hello_in_danish: () => {
        return '${text_to_expect}';
      },      
    };
  rules:
    - entity: ${simulatedEntity}
      element: ${targetSvgElementId}
      state_action:
        - action: call-service
          service: floorplan.text_set          
          service_data:
            element: '${targetSvgElementId}'
            text: |
             > return functions.say_hello_in_danish();
        `,
        simulationFile: 'simulations.yaml',
        isCard: true,
      },
      'examples',
      true,
      () => {}
    );

    // Get the svg
    const svg = await getFloorplanSvg();
    expect(svg).toBeInstanceOf(SVGElement);

    // We'll check if the text is set
    await retry(
      async () => {
        const targetElement = svg.querySelector(
          `#${targetSvgElementId}`
        ) as SVGElement;

        expect(targetElement.id).toEqual(targetSvgElementId);

        // Expect the text content to match the expected value
        const textContent = targetElement.textContent;
        expect(textContent).toBeDefined();

        expect(textContent).toEqual(text_to_expect);
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });

  it('functions > function with arguments', async () => {
    const simulatedEntity = 'sensor.temperature_living_area';
    const targetSvgElementId = 'radar-toggle-btn-text';
    const int_1 = 1;
    const int_2 = 2;

    createFloorplanExampleElement(
      {
        name: 'TestPlate',
        dir: 'test_plate',
        configYaml: `title: TestPlate
config:
  image: /local/floorplan/examples/test_plate/test_plate.svg
  stylesheet: /local/floorplan/examples/test_plate/test_plate.css
  functions: |
    >
    return {
      sum_my_numbers: (a, b) => {
        return a+b; // You'd normally convert it to a string, but we do support numbers, too (convert with: Number(a+b).toString());
      },      
    };
  rules:
    - entity: ${simulatedEntity}
      element: ${targetSvgElementId}
      state_action:
        - action: call-service
          service: floorplan.text_set          
          service_data:
            element: '${targetSvgElementId}'
            text: |
             > return functions.sum_my_numbers(${int_1}, ${int_2}) + "";
        `,
        simulationFile: 'simulations.yaml',
        isCard: true,
      },
      'examples',
      true,
      () => {}
    );

    // Get the svg
    const svg = await getFloorplanSvg();
    expect(svg).toBeInstanceOf(SVGElement);

    // We'll check if the text is set
    await retry(
      async () => {
        const targetElement = svg.querySelector(
          `#${targetSvgElementId}`
        ) as SVGElement;

        expect(targetElement.id).toEqual(targetSvgElementId);

        // Expect the text content to match the expected value
        const textContent = targetElement.textContent;
        expect(textContent).toBeDefined();

        expect(textContent).toEqual(Number(int_1 + int_2).toString());
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });

  it('functions > function to other function-call', async () => {
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
  functions: |
    >
    return {
      fnc_1: (a) => {
        return 'foo' + functions.fnc_2(a);
      },

      fnc_2: (a) => {
        return a;
      },
    };
  rules:
    - entity: ${simulatedEntity}
      element: ${targetSvgElementId}
      state_action:
        - action: call-service
          service: floorplan.text_set          
          service_data:
            element: '${targetSvgElementId}'
            text: |
             > return functions.fnc_1("bar");
        `,
        simulationFile: 'simulations.yaml',
        isCard: true,
      },
      'examples',
      true,
      () => {}
    );

    // Get the svg
    const svg = await getFloorplanSvg();
    expect(svg).toBeInstanceOf(SVGElement);

    // We'll check if the text is set
    await retry(
      async () => {
        const targetElement = svg.querySelector(
          `#${targetSvgElementId}`
        ) as SVGElement;

        expect(targetElement.id).toEqual(targetSvgElementId);

        // Expect the text content to match the expected value
        const textContent = targetElement.textContent;
        expect(textContent).toBeDefined();

        expect(textContent).toEqual("foobar");
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });

  it('functions > function to call action() fnc', async () => {
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
  functions: |
    >
    return {
      fnc_to_call_action_with_data: (a) => {
        const action_data = {
          action: 'call-service',
          service: 'floorplan.text_set',
          service_data: {
            element: '${targetSvgElementId}',
            text: \`state: \${entity.state}\ \${a}bar\`,
          }
        };
        action(action_data);
      },
    };
  rules:
    - entity: ${simulatedEntity}
      element: ${targetSvgElementId}
      state_action:
        - action: call-service
          service: floorplan.execute          
          service_data:
            script_1: |
             > return functions.fnc_to_call_action_with_data("foo");
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

    // We'll check if the text is set
    await retry(
      async () => {
        const targetElement = svg.querySelector(
          `#${targetSvgElementId}`
        ) as SVGElement;

        expect(targetElement.id).toEqual(targetSvgElementId);

        // Expect the text content to match the expected value
        const textContent = targetElement.textContent;
        expect(textContent).toBeDefined();

        const state_from_entity = floorplanElementInstance?.hass?.states?.[simulatedEntity]?.state;
        expect(textContent).toEqual(`state: ${state_from_entity} foobar`);
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });
});
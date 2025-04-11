import '@testing-library/jest-dom';
import '../../../src/components/floorplan-examples/floorplan-examples';
import { FloorplanElement } from '../../../src/components/floorplan/floorplan-element';
import {
  createFloorplanExampleElement,
  getFloorplanElement,
  getFloorplanHelper,
  global_document_object_key,
} from '../jest-floorplan-utils';
import { retry } from '../jest-common-utils';
import { HomeAssistant } from '../../../src/components/floorplan-examples/homeassistant';

describe('Evaluated JS Helpers: Objects', () => {
  beforeEach(() => {
  });

  afterEach(() => {
    // Remove the floorplan-example element from the DOM
    const element = document.querySelector('floorplan-example');
    if (element) element.remove();
  });

  it('config: Is Defined', async () => {
    const simulatedEntity = 'sensor.temperature_living_area';
    const targetSvgElementId = 'entity-1-state';
    const helperToTest = 'config';

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
              document.${global_document_object_key}['${helperToTest}'] = ${helperToTest};
          `,
        simulationFile: 'simulations.yaml',
        isCard: true,
      },
      'examples',
      true,
      () => {}
    );

    // We'll check if the text is set
    await retry(
      async () => {
        const helperRef = await getFloorplanHelper(helperToTest);

        // Check if helper to test exists
        expect(helperRef).toBeDefined();

        // SPECIFIC FOR THIS HELPER:
        // Check if "rules" is set
        expect(helperRef.rules).toBeDefined();

        // Check if "rules" is an array with length 1
        expect(helperRef.rules.length).toEqual(1);

        // Check if it's a execute statement
        expect(
          helperRef.rules[0].state_action[0].service
        ).toEqual('floorplan.execute');
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });

  it('entity: Is Defined', async () => {
    const simulatedEntity = 'sensor.temperature_living_area';
    const targetSvgElementId = 'entity-1-state';
    const helperToTest = 'entity';

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
              document.${global_document_object_key}['${helperToTest}'] = ${helperToTest};
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

    // We'll check if the text is set
    await retry(
      async () => {
        const helperRef = await getFloorplanHelper(helperToTest);

        // Check if helper to test exists
        expect(helperRef).toBeDefined();

        // SPECIFIC FOR THIS HELPER:
        expect(helperRef).toHaveProperty('entity_id');
        expect(helperRef).toHaveProperty('state');
        expect(helperRef.entity_id).toEqual(simulatedEntity);
        expect(helperRef.state).toEqual(
          floorplanElementInstance?.hass?.states?.[simulatedEntity]?.state
        );
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });

  it('entities: Is Defined', async () => {
    const simulatedEntity = 'sensor.temperature_living_area';
    const extraSimulatedEntity = 'sensor.random_text';
    const targetSvgElementId = 'entity-1-state';
    const helperToTest = 'entities';

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
              document.${global_document_object_key}['${helperToTest}'] = ${helperToTest};
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

    // We'll check if the text is set
    await retry(
      async () => {
        const helperRef = await getFloorplanHelper(helperToTest);

        // Check if helper to test exists
        expect(helperRef).toBeDefined();

        // SPECIFIC FOR THIS HELPER:
        // Ensure the helper contains at least one entity
        expect(Object.keys(helperRef).length).toBeGreaterThan(0);

        // Validate the simulated entity
        const entity = helperRef[simulatedEntity];
        expect(entity).toBeDefined();
        expect(entity).toHaveProperty('entity_id', simulatedEntity);
        expect(entity).toHaveProperty('state');
        expect(entity.state).toEqual(
          floorplanElementInstance?.hass?.states?.[simulatedEntity]?.state
        );

        // Validate an additional entity
        const extraEntity = helperRef[extraSimulatedEntity];
        expect(extraEntity).toBeDefined();
        expect(extraEntity).toHaveProperty(
          'entity_id',
          extraSimulatedEntity
        );
        expect(extraEntity).toHaveProperty('state');
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });

  it('states: Is Defined', async () => {
    const simulatedEntity = 'sensor.temperature_living_area';
    const targetSvgElementId = 'entity-1-state';
    const helperToTest = 'states';

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
              document.${global_document_object_key}['${helperToTest}'] = ${helperToTest};
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

    // We'll check if the text is set
    await retry(
      async () => {
        const helperRef = await getFloorplanHelper(helperToTest);

        // Check if helper to test exists
        expect(helperRef).toBeDefined();

        // SPECIFIC FOR THIS HELPER:
        // Ensure the helper contains at least one entity
        expect(Object.keys(helperRef).length).toBeGreaterThan(0);

        // Validate the simulated entity
        const entity = helperRef[simulatedEntity];
        expect(entity).toBeDefined();
        expect(entity).toHaveProperty('entity_id', simulatedEntity);
        expect(entity).toHaveProperty('state');
        expect(entity.state).toEqual(
          floorplanElementInstance?.hass?.states?.[simulatedEntity]?.state
        );

        // Validate an additional entity
        const extraEntityName = 'sensor.random_text';
        const extraEntity = helperRef[extraEntityName];
        expect(extraEntity).toBeDefined();
        expect(extraEntity).toHaveProperty('entity_id', extraEntityName);
        expect(extraEntity).toHaveProperty('state');
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });

  it('hass: Is Defined', async () => {
    const simulatedEntity = 'sensor.temperature_living_area';
    const targetSvgElementId = 'entity-1-state';
    const helperToTest = 'hass';

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
              document.${global_document_object_key}['${helperToTest}'] = ${helperToTest};
            `,
        simulationFile: 'simulations.yaml',
        isCard: true,
      },
      'examples',
      true,
      () => {}
    );

    // We'll check if the text is set
    await retry(
      async () => {
        const helperRef = await getFloorplanHelper(helperToTest);

        // Check if helper to test exists
        expect(helperRef).toBeDefined();

        // SPECIFIC FOR THIS HELPER:
        expect(Object.keys(helperRef).length).toBeGreaterThan(0);

        // Expect the object to be a instance of HomeAssistant
        expect(helperRef).toBeInstanceOf(HomeAssistant);

        // Expected keys or functions
        expect(helperRef?.states).toBeInstanceOf(Object);
        expect(helperRef?.callService).toBeInstanceOf(Function);
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });

  it('element: Is Defined', async () => {
    const simulatedEntity = 'sensor.temperature_living_area';
    const targetSvgElementId = 'entity-1-state';
    const helperToTest = 'element';

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
              document.${global_document_object_key}['${helperToTest}'] = ${helperToTest};
            `,
        simulationFile: 'simulations.yaml',
        isCard: true,
      },
      'examples',
      true,
      () => {}
    );

    // We'll check if the text is set
    await retry(
      async () => {
        const helperRef = await getFloorplanHelper(helperToTest);

        // Check if helper to test exists
        expect(helperRef).toBeDefined();

        // SPECIFIC FOR THIS HELPER:
        expect(helperRef.id).toEqual(targetSvgElementId);
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });

  it('elements: Is Defined', async () => {
    const simulatedEntity = 'sensor.temperature_living_area';
    const targetSvgElementId = 'entity-1-state';
    const extraTargetSvgElementId = 'entity-2-state';
    const helperToTest = 'elements';

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
              document.${global_document_object_key}['${helperToTest}'] = ${helperToTest};
            `,
        simulationFile: 'simulations.yaml',
        isCard: true,
      },
      'examples',
      true,
      () => {}
    );

    // We'll check if the text is set
    await retry(
      async () => {
        const helperRef = await getFloorplanHelper(helperToTest);

        // Check if helper to test exists
        expect(helperRef).toBeDefined();

        // SPECIFIC FOR THIS HELPER:
        // Ensure the helper contains at least one element
        expect(Object.keys(helperRef).length).toBeGreaterThan(0);

        // Validate the target SVG element
        const targetElement = helperRef[targetSvgElementId];
        expect(targetElement).toBeDefined();
        expect(targetElement).toBeInstanceOf(SVGElement);

        // Validate another element
        const extraElement = helperRef[extraTargetSvgElementId];
        expect(extraElement).toBeDefined();
        expect(extraElement).toHaveProperty('id', extraTargetSvgElementId);
        expect(extraElement).toBeInstanceOf(SVGElement);
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });
});
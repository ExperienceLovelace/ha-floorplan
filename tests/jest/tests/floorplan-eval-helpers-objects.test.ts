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
    const simulated_entity = 'sensor.temperature_living_area';
    const target_svg_element_id = 'entity-1-state';
    const helper_to_test = 'config';

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
            test_script_for_helper: |
              > if(typeof document['${global_document_object_key}'] === 'undefined') document.${global_document_object_key} = {};
              document.${global_document_object_key}['${helper_to_test}'] = ${helper_to_test};
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
        const helper_ref = await getFloorplanHelper(helper_to_test);

        // Check if helper to test exists
        expect(helper_ref).toBeDefined();

        // SPECIFIC FOR THIS HELPER:
        // Check if "rules" is set
        expect(helper_ref.rules).toBeDefined();

        // Check if "rules" is an array with length 1
        expect(helper_ref.rules.length).toEqual(1);

        // Check if it's a execute statement
        expect(
          helper_ref.rules[0].state_action[0].service
        ).toEqual('floorplan.execute');
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });

  it('entity: Is Defined', async () => {
    const simulated_entity = 'sensor.temperature_living_area';
    const target_svg_element_id = 'entity-1-state';
    const helper_to_test = 'entity';

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
            test_script_for_helper: |
              > if(typeof document['${global_document_object_key}'] === 'undefined') document.${global_document_object_key} = {};
              document.${global_document_object_key}['${helper_to_test}'] = ${helper_to_test};
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

    // We'll check if the text is set
    await retry(
      async () => {
        const helper_ref = await getFloorplanHelper(helper_to_test);

        // Check if helper to test exists
        expect(helper_ref).toBeDefined();

        // SPECIFIC FOR THIS HELPER:
        expect(helper_ref).toHaveProperty('entity_id');
        expect(helper_ref).toHaveProperty('state');
        expect(helper_ref.entity_id).toEqual(simulated_entity);
        expect(helper_ref.state).toEqual(floorplan_element?.hass?.states?.[simulated_entity]?.state);
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });

  it('entities: Is Defined', async () => {
    const simulated_entity = 'sensor.temperature_living_area';
    const extra_simulated_entity = 'sensor.random_text';
    const target_svg_element_id = 'entity-1-state';
    const helper_to_test = 'entities';

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
            test_script_for_helper: |
              > if(typeof document['${global_document_object_key}'] === 'undefined') document.${global_document_object_key} = {};
              document.${global_document_object_key}['${helper_to_test}'] = ${helper_to_test};
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

    // We'll check if the text is set
    await retry(
      async () => {
        const helper_ref = await getFloorplanHelper(helper_to_test);

        // Check if helper to test exists
        expect(helper_ref).toBeDefined();

        // SPECIFIC FOR THIS HELPER:
        // Ensure the helper contains at least one entity
        expect(Object.keys(helper_ref).length).toBeGreaterThan(0);

        // Validate the simulated entity
        const entity = helper_ref[simulated_entity];
        expect(entity).toBeDefined();
        expect(entity).toHaveProperty('entity_id', simulated_entity);
        expect(entity).toHaveProperty('state');
        expect(entity.state).toEqual(
          floorplan_element?.hass?.states?.[simulated_entity]?.state
        );

        // Validate an additional entity
        const extra_entity = helper_ref[extra_simulated_entity];
        expect(extra_entity).toBeDefined();
        expect(extra_entity).toHaveProperty(
          'entity_id',
          extra_simulated_entity
        );
        expect(extra_entity).toHaveProperty('state');
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });

  it('states: Is Defined', async () => {
    const simulated_entity = 'sensor.temperature_living_area';
    const target_svg_element_id = 'entity-1-state';
    const helper_to_test = 'states';

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
            test_script_for_helper: |
              > if(typeof document['${global_document_object_key}'] === 'undefined') document.${global_document_object_key} = {};
              document.${global_document_object_key}['${helper_to_test}'] = ${helper_to_test};
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

    // We'll check if the text is set
    await retry(
      async () => {
        const helper_ref = await getFloorplanHelper(helper_to_test);

        // Check if helper to test exists
        expect(helper_ref).toBeDefined();

        // SPECIFIC FOR THIS HELPER:
        // Ensure the helper contains at least one entity
        expect(Object.keys(helper_ref).length).toBeGreaterThan(0);

        // Validate the simulated entity
        const entity = helper_ref[simulated_entity];
        expect(entity).toBeDefined();
        expect(entity).toHaveProperty('entity_id', simulated_entity);
        expect(entity).toHaveProperty('state');
        expect(entity.state).toEqual(
          floorplan_element?.hass?.states?.[simulated_entity]?.state
        );

        // Validate an additional entity
        const extra_entity_name = 'sensor.random_text';
        const extra_entity = helper_ref[extra_entity_name];
        expect(extra_entity).toBeDefined();
        expect(extra_entity).toHaveProperty('entity_id', extra_entity_name);
        expect(extra_entity).toHaveProperty('state');
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });

  it('hass: Is Defined', async () => {
    const simulated_entity = 'sensor.temperature_living_area';
    const target_svg_element_id = 'entity-1-state';
    const helper_to_test = 'hass';

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
            test_script_for_helper: |
              > if(typeof document['${global_document_object_key}'] === 'undefined') document.${global_document_object_key} = {};
              document.${global_document_object_key}['${helper_to_test}'] = ${helper_to_test};
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
        const helper_ref = await getFloorplanHelper(helper_to_test);

        // Check if helper to test exists
        expect(helper_ref).toBeDefined();

        // SPECIFIC FOR THIS HELPER:
        expect(Object.keys(helper_ref).length).toBeGreaterThan(0);

        // Expect the object to be a instance of HomeAssistant
        expect(helper_ref).toBeInstanceOf(HomeAssistant);

        // Expected keys or functions
        expect(helper_ref?.states).toBeInstanceOf(Object);
        expect(helper_ref?.callService).toBeInstanceOf(Function);
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });

  it('element: Is Defined', async () => {
    const simulated_entity = 'sensor.temperature_living_area';
    const target_svg_element_id = 'entity-1-state';
    const helper_to_test = 'element';

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
            test_script_for_helper: |
              > if(typeof document['${global_document_object_key}'] === 'undefined') document.${global_document_object_key} = {};
              document.${global_document_object_key}['${helper_to_test}'] = ${helper_to_test};
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
        const helper_ref = await getFloorplanHelper(helper_to_test);

        // Check if helper to test exists
        expect(helper_ref).toBeDefined();

        // SPECIFIC FOR THIS HELPER:
        expect(helper_ref.id).toEqual(target_svg_element_id);
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });

  it('elements: Is Defined', async () => {
    const simulated_entity = 'sensor.temperature_living_area';
    const target_svg_element_id = 'entity-1-state';
    const extra_target_svg_element_id = 'entity-2-state';
    const helper_to_test = 'elements';

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
            test_script_for_helper: |
              > if(typeof document['${global_document_object_key}'] === 'undefined') document.${global_document_object_key} = {};
              document.${global_document_object_key}['${helper_to_test}'] = ${helper_to_test};
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
        const helper_ref = await getFloorplanHelper(helper_to_test);

        // Check if helper to test exists
        expect(helper_ref).toBeDefined();

        // SPECIFIC FOR THIS HELPER:
        // Ensure the helper contains at least one element
        expect(Object.keys(helper_ref).length).toBeGreaterThan(0);

        // Validate the target SVG element
        const target_element = helper_ref[target_svg_element_id];
        expect(target_element).toBeDefined();
        expect(target_element).toBeInstanceOf(SVGElement);

        // Validate another element
        const extra_element = helper_ref[extra_target_svg_element_id];
        expect(extra_element).toBeDefined();
        expect(extra_element).toHaveProperty('id', extra_target_svg_element_id);
        expect(extra_element).toBeInstanceOf(SVGElement);
      },
      10,
      700 // This should not match the emulator time sequence
    );
  });
});
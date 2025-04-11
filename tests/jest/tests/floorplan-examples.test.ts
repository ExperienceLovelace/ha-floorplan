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
import { retry } from '../jest-common-utils';

describe('Constructors for Tests', () => {
  beforeEach(() => {
  });

  afterEach(() => {
    // Remove the floorplan-example element from the DOM
    const element = document.querySelector('floorplan-example');
    if (element) element.remove();
  });

  it('Will load config YAML from files', async () => {
  // Create the floorplan-example element using the utility function
    createFloorplanExampleElement(
      {
        name: 'home',
        dir: 'home',
        configFile: 'home.yaml',
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

    const entityToBeExpected = 'sensor.moisture_level';

    // Check if entity is part of element.entityInfos, meaning that the rules are correctly loaded
    expect(
      floorplanElementInstance?.entityInfos?.[entityToBeExpected]
    ).toHaveProperty('lastState');

    const action = floorplanElementInstance?.entityInfos?.[entityToBeExpected]
      ?.ruleInfos[0]?.rule?.state_action as FloorplanCallServiceActionConfig;
    expect(action?.service).toEqual('floorplan.style_set');
  });

  it('Will use config YAML from direct string', async () => {
    // Create the floorplan-example element using the utility function
    createFloorplanExampleElement(
      {
        name: 'home',
        dir: 'home',
        configYaml: `title: Home
config:
  image: /local/floorplan/examples/home/home.svg
  stylesheet: /local/floorplan/examples/home/home.css
  log_level: info
  console_log_level: info

  defaults:
    hover_action: hover-info
    tap_action: more-info

  rules:
    - entity: sensor.moisture_level
      state_action:
        action: call-service
        service: floorplan.style_set
        service_data:
          element: moisture-level-clip-path
          style: 'height: 10px'
        `,
        simulationFile: 'simulations.yaml',
        isCard: true,
      },
      'examples',
      true,
      () => {}
    );

    return await retry(
      async () => {
        // Use the utility function to get the floorplan element
        const floorplanElementInstance = await getFloorplanElement();
        expect(floorplanElementInstance).toBeInstanceOf(FloorplanElement);

        const entityToBeExpected = 'sensor.moisture_level';

        // Check if entity is part of element.entityInfos, meaning that the rules are correctly loaded
        expect(
          floorplanElementInstance?.entityInfos?.[entityToBeExpected]
        ).toHaveProperty('lastState');

        const action = floorplanElementInstance?.entityInfos?.[
          entityToBeExpected
        ]?.ruleInfos[0]?.rule?.state_action as FloorplanCallServiceActionConfig;
        expect(action?.service).toEqual('floorplan.style_set');
        expect(action?.service_data?.style).toEqual('height: 10px');        
      },
      10,
      100
    );
  });

  it('Will use simulator YAML from files', async () => {
    createFloorplanExampleElement(
      {
        name: 'home',
        dir: 'home',
        configYaml: `title: Home
config:
  image: /local/floorplan/examples/home/home.svg
  stylesheet: /local/floorplan/examples/home/home.css
  log_level: info
  console_log_level: info

  defaults:
    hover_action: hover-info
    tap_action: more-info

  rules:
    - entity: sensor.moisture_level
      state_action:
        action: call-service
        service: floorplan.style_set
        service_data:
          element: moisture-level-clip-path
          style: 'height: 10px'
        `,
        simulationFile: 'simulations.yaml',
        isCard: true,
      },
      'examples',
      true,
      () => {}
    );

    const entityToBeExpected = 'sensor.moisture_level';

    let simulator: HassSimulator | undefined;

    await retry(
      async () => {
        // Use the utility function to get the floorplan element
        const exampleElement = await getFloorplanExampleElement();
        expect(exampleElement).toBeInstanceOf(FloorplanExampleElement);

        // Get the simulator object
        simulator = exampleElement?.simulator;
        expect(simulator).toBeInstanceOf(HassSimulator);


        // Check if entityToBeExpected is part of simulator.simulationProcessors
        const simulationProcessors =
          simulator?.simulationProcessors as SimulationProcessor[];

        // Check each of the simulation processors, and their entities array
        let found = false;

        for (const simulationProcessor of simulationProcessors) {
          if (simulationProcessor.entities.includes(entityToBeExpected)) {
            found = true;
            break;
          }
        }

        expect(found).toBe(true);
      },
      10,
      100
    );

    // Check the state of the entity
    const entityAttributeValueBefore = (simulator?.hass?.states?.[
      entityToBeExpected
    ]?.attributes as Record<string, unknown>)?.level as number;

    // Retry until the state changes
    return await retry(
      async () => {
        const entity_attribute_value_after = (
          simulator?.hass?.states?.[entityToBeExpected]
            ?.attributes as Record<string, unknown>
        )?.level as number;

        expect(entityAttributeValueBefore).not.toEqual(
          entity_attribute_value_after
        );
      },
      10,
      100
    );
  });

  it('Will use simulator YAML from direct string', async () => {
    createFloorplanExampleElement(
      {
        name: 'home',
        dir: 'home',
        configYaml: `title: Home
config:
  image: /local/floorplan/examples/home/home.svg
  stylesheet: /local/floorplan/examples/home/home.css
  log_level: info
  console_log_level: info

  defaults:
    hover_action: hover-info
    tap_action: more-info

  rules:
    - entity: sensor.moisture_level
      state_action:
        action: call-service
        service: floorplan.style_set
        service_data:
          element: moisture-level-clip-path
          style: 'height: 10px'
        `,
        simulationYaml: `
simulations:
  - entity: sensor.moisture_level
    states: |
      >
      var MIN = 0;
      var MAX = 100;
      var STEP = 1;

      var currentLevel = entity.attributes ? entity.attributes.level : MIN;
      var currentIsAscending = entity.attributes ? entity.attributes.isAscending : true;

      var level = (currentIsAscending && (currentLevel < MAX)) || (!currentIsAscending && (currentLevel <= MIN)) ?
        currentLevel + STEP : currentLevel - STEP;

      var isAscending = (currentIsAscending && (currentLevel >= MAX)) ? false :
      ((!currentIsAscending && (currentLevel <= MIN)) ? true : currentIsAscending);

      return {
        state: 'on',
        attributes: { level: level, isAscending: isAscending },
        duration: '25ms'
      };
        `,
        isCard: true,
      },
      'examples',
      true,
      () => {}
    );

    const entityToBeExpected = 'sensor.moisture_level';

    let simulator: HassSimulator | undefined;

    await retry(
      async () => {
        // Use the utility function to get the floorplan element
        const exampleElement = await getFloorplanExampleElement();
        expect(exampleElement).toBeInstanceOf(FloorplanExampleElement);

        // Get the simulator object
        simulator = exampleElement?.simulator;
        expect(simulator).toBeInstanceOf(HassSimulator);

        // Check if entityToBeExpected is part of simulator.simulationProcessors
        const simulationProcessors =
          simulator?.simulationProcessors as SimulationProcessor[];

        // Check each of the simulation processors, and their entities array
        let found = false;

        for (const simulationProcessor of simulationProcessors) {
          if (simulationProcessor.entities.includes(entityToBeExpected)) {
            found = true;
            break;
          }
        }

        expect(found).toBe(true);
      },
      10,
      100
    );

    // Check the state of the entity
    const entityAttributeValueBefore = (simulator?.hass?.states?.[entityToBeExpected]?.attributes as Record<string, unknown>)?.level as number;

    // Retry until the state changes
    return await retry(
      async () => {
        const entity_attribute_value_after = (simulator?.hass?.states?.[entityToBeExpected]?.attributes as Record<string, unknown>)?.level as number;

        expect(entityAttributeValueBefore).not.toEqual(
          entity_attribute_value_after
        );
      },
      10,
      100
    );
  });

  it.todo('Add test for isCard: false (panel)');
});

describe('Simulator', () => {
  beforeEach(() => {
    // Create the floorplan-example element using the utility function
    createFloorplanExampleElement(
      {
        name: 'home',
        dir: 'home',
        configFile: 'home.yaml',
        simulationFile: 'simulations.yaml',
        isCard: true,
      },
      'examples',
      true,
      () => {}
    );
  });

  afterEach(() => {
    // Remove the floorplan-example element from the DOM
    const element = document.querySelector('floorplan-example');
    if (element) element.remove();
  });

  it('Will Simulate Values and trigger Rules', async () => {
    // Use the utility function to get the floorplan element
    const floorplanElementInstance = await getFloorplanElement();
    expect(floorplanElementInstance).toBeInstanceOf(FloorplanElement);

    // Get the svg
    const svg = await getFloorplanSvg();
    expect(svg).toBeInstanceOf(SVGElement);

    const levelBefore =
      floorplanElementInstance?.hass?.states?.['sensor.moisture_level']
        ?.attributes?.level ?? null;
    
    // The moisture level is meant to change over time, so wait and validate that it changes
    return await retry(
      async () => {
      const updatedLevel =
        floorplanElementInstance?.hass?.states?.['sensor.moisture_level']
          ?.attributes?.level ?? null;
      expect(updatedLevel).not.toEqual(levelBefore);
      },
      10,
      100
    );
  });

  it('Will trigger Rules with Simulated Values', async () => {
    // Use the utility function to get the floorplan element
    const element = await getFloorplanElement();
    expect(element).toBeInstanceOf(FloorplanElement);

    // Get the svg
    const svg = await getFloorplanSvg();
    expect(svg).toBeInstanceOf(SVGElement);

    // Get moisture-level-clip-path
    const moistureLevelClipPath = svg?.querySelector(
      'clipPath#moisture-level-clip-path'
    ) as SVGElementWithStyle;
    expect(moistureLevelClipPath).toBeInstanceOf(SVGElement);
    expect(moistureLevelClipPath).toHaveProperty('style');

    const levelBefore =
      element?.hass?.states?.['sensor.moisture_level']?.attributes?.level ??
      null;
    const transformBefore =
      moistureLevelClipPath?.style?.getPropertyValue('transform') ?? '';

      // The moisture level is meant to change over time, so wait and validate that it changes
    return await retry(
      async () => {
        const levelAfter =
          element?.hass?.states?.['sensor.moisture_level']?.attributes?.level ??
          null;
        const transformAfter =
          moistureLevelClipPath?.style?.getPropertyValue('transform') ?? '';

        // Check that the level and transform have changed
        expect(levelBefore).not.toEqual(levelAfter);
        expect(transformBefore).not.toEqual(transformAfter);
        expect(transformAfter).toMatch(/translate\(\d+, \d+px\)/);
      },
      10,
      100
    );
  });
});